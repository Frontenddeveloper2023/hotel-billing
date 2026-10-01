// Shared image URL helper (same logic that was duplicated in
// FoodCard, FoodSearch and EditFood).
export function getFoodImageUrl(imagePath) {
    if (!imagePath) return "";

    if (
        imagePath.startsWith("http://") ||
        imagePath.startsWith("https://") ||
        imagePath.startsWith("blob:")
    ) {
        return imagePath;
    }

    let baseUrl =
        import.meta.env.VITE_BACKEND_URL ||
        "https://webscape.co.in/hotel-billing-system-backend";

    baseUrl = baseUrl.replace(/\/+$/, "");
    baseUrl = baseUrl.replace(/\/api$/, "");
    baseUrl = baseUrl.replace(/\/hotel-billing-system-backend$/, "");

    const cleanPath = imagePath.replace(/\\/g, "/").replace(/^\/+/, "");
    const formattedPath = cleanPath.startsWith("uploads/")
        ? cleanPath
        : `uploads/${cleanPath}`;

    return `${baseUrl}/hotel-billing-system-backend/${formattedPath}`;
}