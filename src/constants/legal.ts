/**
 * In-app summaries of how ColorTheory handles data. These describe what this codebase actually
 * does. They are NOT a substitute for a lawyer-reviewed privacy policy and terms — set
 * NEXT_PUBLIC_PRIVACY_URL / NEXT_PUBLIC_TERMS_URL to link your published documents.
 */
export interface LegalSection {
  heading: string;
  body: string;
}

export const PRIVACY_SECTIONS: LegalSection[] = [
  {
    heading: 'Your portrait stays in your browser by default',
    body: 'On-device analysis decodes a small copy of your photo in your browser’s memory to estimate colour characteristics. Nothing is uploaded. The resized portrait (with location and camera metadata removed) is kept in this browser’s private site storage so you can revisit your results, and you can delete it at any time. Clearing site data for ColorTheory also removes it.',
  },
  {
    heading: 'Cloud storage and cloud analysis are opt-in',
    body: 'If you choose cloud analysis or cloud portrait storage, your portrait is uploaded to a private storage bucket that only your account can read. We ask for explicit consent before each upload. Signed links used to display or process it expire within minutes.',
  },
  {
    heading: 'Third-party AI providers',
    body: 'AI outfit previews and cloud analysis send your portrait to a third-party model provider through our server, using a link that expires within minutes. Providers process the image to return a result; see their retention terms (linked from the privacy page). We never sell your images or use them to train models.',
  },
  {
    heading: 'What we store about you',
    body: 'With an account: your email, display name, analysis results (colours and estimated characteristics), saved palettes, favourite colours and saved outfits. In demo mode, everything stays in this browser on this device.',
  },
  {
    heading: 'Shopping links',
    body: '“Shop this look” buttons open a store’s own search (for example Myntra, Zara or Westside) in a new tab. The store receives only the search words — such as “navy blue shirt for women” — just as if you had typed them there. Your photo, palette and account are never shared with stores, and ColorTheory does not copy store listings. Which stores you see and who you shop for are saved in this browser only.',
  },
  {
    heading: 'Estimates, not diagnoses',
    body: 'Undertone, depth and contrast are visual estimates from one photo. Lighting, camera processing and makeup change colour. Results are styling suggestions, not medical, dermatological or scientific assessments.',
  },
  {
    heading: 'Deleting your data',
    body: 'Delete any single analysis (with its portrait and previews), all portraits, your whole history, or your account from Settings. Account deletion removes your stored images and all database records.',
  },
];

export const TERMS_SECTIONS: LegalSection[] = [
  {
    heading: 'Using ColorTheory',
    body: 'ColorTheory offers colour and styling suggestions for personal use. Upload only photos of yourself, or of people who have given you permission.',
  },
  {
    heading: 'Generated previews',
    body: 'AI previews are approximations. They may not preserve your appearance perfectly and should not be relied on for purchasing decisions without trying garments on.',
  },
  {
    heading: 'Demo content',
    body: 'Anything labelled “Demo” is sample content and is not based on your photo.',
  },
  {
    heading: 'Your account',
    body: 'You are responsible for keeping your login secure. You can delete your account at any time from Settings.',
  },
];
