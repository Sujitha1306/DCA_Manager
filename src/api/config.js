// Determines backend URL based on environment
// For Render, you will need to replace the Production URL once you have it.
const IS_DEV = import.meta.env.DEV;

export const API_BASE_URL = IS_DEV
    ? 'http://localhost:3000'
    : 'https://dca-backend-usyt.onrender.com'; // User provided this URL in the image!
// Note: User's image showed "https://dca-backend-usyt.onrender.com"
