
import React from "react";
import { Pencil, Trash2, Utensils } from "lucide-react";

export default function FoodCard({ food, onEdit, onDelete }) {
  if (!food) {
    return null;
  }

  // ----------------------------------
  // IMAGE URL
  // ----------------------------------
  const getFoodImageUrl = (imagePath) => {
    if (!imagePath) {
      return "";
    }

    // Already a complete URL
    if (
      imagePath.startsWith("http://") ||
      imagePath.startsWith("https://")
    ) {
      return imagePath;
    }

    let baseUrl =
      import.meta.env.VITE_BACKEND_URL ||
      "https://webscape.co.in/hotel-billing-system-backend";

    // Clean trailing slashes
    baseUrl = baseUrl.replace(/\/+$/, "");

    // Remove /api if present
    baseUrl = baseUrl.replace(/\/api$/, "");

    // Remove backend folder if already present
    baseUrl = baseUrl.replace(
      /\/hotel-billing-system-backend$/,
      ""
    );

    const cleanPath = imagePath.replace(/^\/+/, "");

    const formattedPath = cleanPath.startsWith("uploads/")
      ? cleanPath
      : `uploads/${cleanPath}`;

    return `${baseUrl}/hotel-billing-system-backend/${formattedPath}`;
  };

  const displayImage = getFoodImageUrl(food.foodImage);

  const foodName = food.foodName?.trim() || "Untitled Dish";

  const description =
    food.description?.trim() ||
    "No description provided for this menu item.";

  const price = Number(food.foodPrice || 0).toLocaleString("en-IN");

  return (
    <div
      className="
        group
        w-full
        h-full
        min-w-0
        bg-white
        border
        border-slate-200
        rounded-2xl
        overflow-hidden
        shadow-sm

        hover:shadow-lg
        hover:border-slate-300
        hover:-translate-y-0.5

        active:translate-y-0

        transition-all
        duration-300

        flex
        flex-col
      "
    >
      {/* =====================================================
          IMAGE
      ===================================================== */}
      <div
        className="
          relative
          w-full

          h-40
          xs:h-44
          sm:h-48
          md:h-52
          lg:h-48
          xl:h-52

          bg-slate-100
          overflow-hidden
          shrink-0
        "
      >
        {displayImage ? (
          <img
            src={displayImage}
            alt={foodName}
            loading="lazy"
            className="
              w-full
              h-full
              object-cover

              transition-transform
              duration-500

              group-hover:scale-[1.04]
            "
            onError={(e) => {
              e.currentTarget.style.display = "none";

              const parent = e.currentTarget.parentElement;

              if (parent && !parent.querySelector(".image-fallback")) {
                const fallback = document.createElement("div");

                fallback.className =
                  "image-fallback absolute inset-0 flex flex-col items-center justify-center bg-slate-100 text-slate-400";

                fallback.innerHTML = `
                  <div class="flex flex-col items-center justify-center">
                    <div class="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white flex items-center justify-center shadow-sm">
                      <span style="font-size:22px;">🍽️</span>
                    </div>
                    <span style="font-size:11px; margin-top:8px; font-weight:600;">
                      Image unavailable
                    </span>
                  </div>
                `;

                parent.appendChild(fallback);
              }
            }}
          />
        ) : (
          <div
            className="
              w-full
              h-full
              flex
              flex-col
              items-center
              justify-center
              bg-slate-50
              text-slate-400
            "
          >
            <div
              className="
                w-12
                h-12
                sm:w-14
                sm:h-14
                rounded-full
                bg-white
                flex
                items-center
                justify-center
                shadow-sm
              "
            >
              <Utensils className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>

            <span className="text-[10px] sm:text-xs font-medium mt-2">
              No image
            </span>
          </div>
        )}

        {/* IMAGE OVERLAY */}
        {displayImage && (
          <div
            className="
              absolute
              inset-0
              bg-gradient-to-t
              from-black/10
              via-transparent
              to-transparent
              pointer-events-none
            "
          />
        )}
      </div>

      {/* =====================================================
          CONTENT
      ===================================================== */}
      <div
        className="
          p-3.5
          sm:p-4
          md:p-4.5

          flex
          flex-col
          flex-1

          min-w-0
        "
      >
        {/* ===================================================
            NAME + PRICE
        =================================================== */}
        <div
          className="
            flex
            flex-col
            min-[400px]:flex-row

            min-[400px]:items-start
            min-[400px]:justify-between

            gap-2.5
            min-w-0
          "
        >
          {/* NAME + DESCRIPTION */}
          <div
            className="
              min-w-0
              flex-1
            "
          >
            <h3
              title={foodName}
              className="
                text-sm
                sm:text-base

                font-bold
                text-slate-900

                leading-snug
                tracking-tight

                line-clamp-2

                break-words
              "
            >
              {foodName}
            </h3>

            <p
              title={description}
              className="
                text-[11px]
                sm:text-xs

                text-slate-500

                mt-1.5

                line-clamp-2

                min-h-[30px]
                sm:min-h-[32px]

                leading-relaxed
              "
            >
              {description}
            </p>
          </div>

          {/* PRICE */}
          <div
            className="
              shrink-0

              min-[400px]:text-right
              self-start
            "
          >
            <span
              className="
                inline-flex
                items-center

                text-xs
                sm:text-sm

                font-extrabold

                text-teal-700

                whitespace-nowrap

                bg-teal-50

                px-2.5
                sm:px-3

                py-1
                sm:py-1.5

                rounded-lg
                sm:rounded-xl

                border
                border-teal-100

                shadow-sm
              "
            >
              ₹{price}
            </span>
          </div>
        </div>

        {/* ===================================================
            ACTION AREA
        =================================================== */}
        <div
          className="
            flex
            items-center
            justify-between

            gap-3

            pt-3
            sm:pt-3.5

            mt-auto
            mt-4

            border-t
            border-slate-100
          "
        >
          {/* LEFT SIDE LABEL */}
          <span
            className="
              hidden
              min-[400px]:block

              text-[10px]
              sm:text-[11px]

              font-medium
              text-slate-400

              truncate
            "
          >
            Menu item
          </span>

          {/* ACTION BUTTONS */}
          <div className="flex items-center gap-2 ml-auto">
            {/* EDIT */}
            <button
              type="button"
              onClick={() => onEdit(food)}
              aria-label={`Edit ${foodName}`}
              title="Edit food"
              className="
                w-9
                h-9
                sm:w-10
                sm:h-10

                rounded-xl

                border
                border-slate-200

                bg-slate-50

                flex
                items-center
                justify-center

                text-slate-600

                hover:bg-teal-50
                hover:text-teal-700
                hover:border-teal-200

                active:scale-95

                transition-all
                duration-200

                cursor-pointer

                focus:outline-none
                focus:ring-2
                focus:ring-teal-200
              "
            >
              <Pencil className="w-4 h-4 sm:w-[17px] sm:h-[17px]" />
            </button>

            {/* DELETE */}
            <button
              type="button"
              onClick={() => onDelete(food)}
              aria-label={`Delete ${foodName}`}
              title="Delete food"
              className="
                w-9
                h-9
                sm:w-10
                sm:h-10

                rounded-xl

                border
                border-slate-200

                bg-slate-50

                flex
                items-center
                justify-center

                text-slate-600

                hover:bg-rose-50
                hover:text-rose-600
                hover:border-rose-200

                active:scale-95

                transition-all
                duration-200

                cursor-pointer

                focus:outline-none
                focus:ring-2
                focus:ring-rose-200
              "
            >
              <Trash2 className="w-4 h-4 sm:w-[17px] sm:h-[17px]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
