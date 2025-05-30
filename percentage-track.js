// PERCENTAGE TRACK FUNCTION------------------------------------------

function initializePercentageTracks(scope = document) {
  scope.querySelectorAll("[percentage-track]").forEach(track => {
    try {
      if (track.__initialized) return; // prevent double init
      track.__initialized = true;

      let schematic = track.getAttribute("percentage-track");
      let classPrefix = track.getAttribute("class-prefix") || "";
      let additionalClasses = track.getAttribute("additional-class");
      let additionalClassList = additionalClasses ? additionalClasses.split(" ") : [];

      let pattern = /\[(\d+),\s*([^\]]+)\]/g;
      let match;

      while ((match = pattern.exec(schematic)) !== null) {
        let count = parseInt(match[1], 10);
        let styleClass = match[2].trim();

        if (classPrefix) {
          styleClass = `${classPrefix}${styleClass}`;
        }

        for (let i = 0; i < count; i++) {
          let bar = document.createElement("div");
          bar.classList.add("percentage-track-bar", styleClass);
          additionalClassList.forEach(cls => bar.classList.add(cls));
          bar.setAttribute("dark-mode", "true");

          if (i === 0) bar.classList.add("first");
          if (i === count - 1) bar.classList.add("last");

          track.appendChild(bar);
        }
      }
    } catch (error) {
      console.warn("Skipping a percentage-track due to an error:", error);
    }
  });
}
// END OF PERCENTAGE TRACK FUNCTION------------------------------------------
