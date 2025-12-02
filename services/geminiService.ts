import { GoogleGenAI, Type } from "@google/genai";
import type { Candidate } from '../types';

/**
 * A promise that resolves with the configured pdfjsLib object.
 * This is designed to handle the asynchronous loading of the PDF.js library from a CDN.
 * It ensures that the library is loaded and its worker is configured before any code attempts to use it,
 * preventing race conditions. The promise is memoized, so the check only runs once.
 */
const getPdfjsLibPromise = new Promise<any>((resolve, reject) => {
    let attempt = 0;
    const check = () => {
        // The pdfjsLib object is attached to the window by the script loaded in index.html
        if (typeof (window as any).pdfjsLib !== 'undefined') {
            const pdfjs = (window as any).pdfjsLib;
            // Configure the worker if it hasn't been already.
            if (!pdfjs.GlobalWorkerOptions.workerSrc) {
                // Use a recent, stable version of the worker.
                pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
            }
            resolve(pdfjs);
        } else if (attempt < 40) { // Increased timeout to 4 seconds for slower connections
            attempt++;
            setTimeout(check, 100);
        } else {
            reject(new Error("Failed to load PDF library. Please check your internet connection and refresh."));
        }
    };
    check();
});

/**
 * Safely retrieves the configured PDF.js library instance.
 * @returns {Promise<any>} A promise that resolves with the pdfjsLib object.
 */
export const getConfiguredPdfjsLib = (): Promise<any> => {
    return getPdfjsLibPromise;
};

const fileToGenerativePart = async (file: File, pages: number[] | undefined, onProgress: (progress: number) => void) => {
  onProgress(5); // Initial progress
  if (file.type.startsWith('image/')) {
    const base64 = await toBase64(file);
    onProgress(80); // File processing done
    return {
      inlineData: {
        mimeType: file.type,
        data: base64,
      },
    };
  } else if (file.type === 'application/pdf') {
    const pdfjsLib = await getConfiguredPdfjsLib();
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;

    // If pages are not specified (e.g. auto-parse), select ALL pages.
    const pagesToParse = pages && pages.length > 0 
        ? pages 
        : Array.from({ length: pdf.numPages }, (_, i) => i + 1);
        
    const renderedPages: { canvas: HTMLCanvasElement; width: number; height: number }[] = [];
    let totalHeight = 0;
    let maxWidth = 0;
    
    const totalPagesToProcess = pagesToParse.length;
    let processedPages = 0;

    for (const pageNum of pagesToParse) {
        if (pageNum > pdf.numPages || pageNum < 1) continue; // Skip invalid page numbers

        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        if (!context) continue;

        await page.render({ canvasContext: context, viewport }).promise;
        
        processedPages++;
        // Allocate 75% of progress to PDF page rendering
        const progress = 5 + Math.round((processedPages / totalPagesToProcess) * 75);
        onProgress(progress);

        renderedPages.push({ canvas, width: canvas.width, height: canvas.height });
        totalHeight += canvas.height;
        maxWidth = Math.max(maxWidth, canvas.width);
    }

    if (renderedPages.length === 0) {
        throw new Error('Could not render any PDF pages.');
    }

    // Create a final canvas to stitch the rendered pages together vertically
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = maxWidth;
    finalCanvas.height = totalHeight;
    const finalContext = finalCanvas.getContext('2d');

    if (!finalContext) {
        throw new Error('Could not create final canvas context');
    }
    // Fill with white background to avoid transparency issues
    finalContext.fillStyle = 'white';
    finalContext.fillRect(0, 0, finalCanvas.width, finalCanvas.height);

    let currentY = 0;
    for (const { canvas } of renderedPages) {
        finalContext.drawImage(canvas, 0, currentY);
        currentY += canvas.height;
    }

    const base64 = finalCanvas.toDataURL('image/jpeg').split(',')[1];
    onProgress(80); // Final step before returning
    return {
      inlineData: {
        mimeType: 'image/jpeg',
        data: base64,
      },
    };

  } else if (file.type.includes('wordprocessingml') || file.type.includes('msword')) {
    const arrayBuffer = await file.arrayBuffer();
    const result = await (window as any).mammoth.extractRawText({ arrayBuffer });
    onProgress(80); // File processing done
    return { text: result.value };
  } else {
    throw new Error(`Unsupported file type: ${file.type}`);
  }
};

const toBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // remove "data:*/*;base64," prefix
      resolve(result.split(',')[1]);
    };
    reader.onerror = (error) => reject(error);
  });
};

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const resumeSchema = {
    type: Type.OBJECT,
    properties: {
        fullName: { type: Type.STRING },
        email: { type: Type.STRING },
        mobile: { type: Type.STRING },
        dob: { type: Type.STRING, description: "Date of Birth, e.g., YYYY-MM-DD or DD/MM/YYYY" },
        currentCompany: { type: Type.STRING },
        designation: { type: Type.STRING, description: "Designation in Current Company" },
        totalExperience: { type: Type.STRING, description: "e.g., '5 years', '3 months'" },
        relevantExperience: { type: Type.STRING, description: "e.g., '3 years'" },
        skills: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "A list of key technical and soft skills found in the resume."
        },
        currentCTC: { type: Type.STRING, description: "e.g., '12 LPA', '$80,000'" },
        expectedCTC: { type: Type.STRING, description: "e.g., '15 LPA', '$95,000'" },
        noticePeriod: { type: Type.STRING, description: "e.g., '30 days', 'Immediate Joiner'" },
        highestQualification: { type: Type.STRING },
        educationField: { type: Type.STRING, description: "Education in/Branch/Field" },
        currentLocation: { type: Type.STRING },
    },
    required: ["fullName", "email", "mobile", "totalExperience", "highestQualification", "currentLocation", "skills"]
};

// Helper function to parse experience strings into numbers (years)
const parseExperienceToNumber = (expString: string): number => {
  if (!expString) return 0;
  const lowerExp = expString.toLowerCase().trim();
  let totalYears = 0;

  // Regex for years and months
  // Handles: "5 years 6 months", "5.5 years", "6 months", "5 yrs"
  const yearMatches = lowerExp.match(/(\d+(\.\d+)?)\s*(y|yr|year)/);
  const monthMatches = lowerExp.match(/(\d+(\.\d+)?)\s*(m|mon|month)/);

  if (yearMatches) {
    totalYears += parseFloat(yearMatches[1]);
  }

  if (monthMatches) {
    totalYears += parseFloat(monthMatches[1]) / 12;
  }

  // If no units found, check if it's just a number and assume years (fallback)
  if (!yearMatches && !monthMatches) {
      const numMatch = lowerExp.match(/^(\d+(\.\d+)?)$/);
      if (numMatch) {
          totalYears = parseFloat(numMatch[1]);
      }
  }
  
  // Round to 1 decimal place
  return Math.round(totalYears * 10) / 10;
};


export const parseResume = async (file: File, pages: number[] | undefined, onProgress: (progress: number) => void): Promise<Candidate> => {
    try {
        const filePart = await fileToGenerativePart(file, pages, onProgress);

        const prompt = `
            You are an expert HR assistant specializing in parsing resumes.
            Analyze the provided resume content (which could be an image or text) and extract the candidate's details.
            Strictly follow the JSON schema provided.
            
            Instructions for specific fields:
            1. **Mobile Number**: Extract digits only. Remove spaces, brackets, hyphens. (e.g., "9876543210").
            2. **Skills**: Identify and list all key technical skills (like Python, React, AWS) and soft skills (like Teamwork, Communication) as a list of strings.
            3. **Experience**: Extract the exact text found (e.g., "5 years", "6 months", "2 years 4 months"). Do not convert to a number yet.
            4. **General**: If a specific piece of information is not found, return an empty string "" for that field, or an empty list [] for the skills field. Do not make up information.
        `;
        
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: {
                parts: [filePart, { text: prompt }]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: resumeSchema
            }
        });

        onProgress(95); // AI call complete, now parsing JSON

        let parsedJson;
        try {
            parsedJson = JSON.parse(response.text || "{}");
        } catch (jsonError) {
            console.error("Failed to parse JSON response from Gemini:", response.text);
            throw new Error("The AI model returned an invalid data format. Please try again.");
        }

        onProgress(100); // All done

        // Post-process numeric fields
        const finalCandidate: Candidate = {
            id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substr(2),
            ...parsedJson,
            totalExperience: parseExperienceToNumber(parsedJson.totalExperience),
            relevantExperience: parseExperienceToNumber(parsedJson.relevantExperience),
            fileName: file.name,
            isShortlisted: false
        };

        return finalCandidate;

    } catch (error) {
        console.error("Error parsing resume:", error);
        if (error instanceof Error) {
            throw new Error(`AI processing failed: ${error.message}`);
        }
        throw new Error("An unknown error occurred during parsing.");
    }
};

// --- Job Description Matching Service ---

const jobMatchSchema = {
    type: Type.OBJECT,
    properties: {
        matchScore: { type: Type.INTEGER, description: "A score from 0 to 100 indicating how well the candidate matches the job description." },
        matchReason: { type: Type.STRING, description: "A detailed explanation highlighting specific strong matches (skills/experience) and specific missing critical requirements relative to the JD." }
    },
    required: ["matchScore", "matchReason"]
};

export const analyzeCandidateMatch = async (candidate: Candidate, jobDescription: string): Promise<{ matchScore: number, matchReason: string }> => {
    try {
        // Prepare a lightweight version of the candidate object to save tokens
        const candidateSummary = {
            skills: candidate.skills,
            totalExperience: candidate.totalExperience,
            designation: candidate.designation,
            currentCompany: candidate.currentCompany,
            education: candidate.highestQualification,
            location: candidate.currentLocation
        };

        const prompt = `
            You are an expert AI Recruiter. 
            Compare the following Candidate Profile against the provided Job Description.
            
            **Candidate Profile:**
            ${JSON.stringify(candidateSummary)}

            **Job Description:**
            "${jobDescription}"

            **Task:**
            1. Calculate a match percentage score (0-100) based on skills, experience, and relevance.
            2. Provide a detailed match reason.
               - Explicitly list the **Strong Matches**: What key skills or experience does the candidate possess that align with the JD?
               - Explicitly list the **Gaps/Missing**: What critical skills or experience are missing or insufficient?
               - Be specific (e.g., "Matches: React, Node.js. Missing: AWS certification").
            
            Return JSON.
        `;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: [{ text: prompt }] },
            config: {
                responseMimeType: "application/json",
                responseSchema: jobMatchSchema
            }
        });

        const result = JSON.parse(response.text || "{}");
        return {
            matchScore: result.matchScore,
            matchReason: result.matchReason
        };

    } catch (error) {
        console.error("Error analyzing job match:", error);
        return { matchScore: 0, matchReason: "Failed to analyze match." };
    }
};