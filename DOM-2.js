document.addEventListener("DOMContentLoaded", function () {
    
    
// DROPDOWN FUNCTIONS-----------------------------------------------

function easeQuadInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function animateGrow(element, duration, callback) {
  element.style.height = "auto";
  const targetHeight = element.offsetHeight;
  element.style.height = "0px";
  element.style.display = "flex";

  let startTime;
  function step(timestamp) {
    if (!startTime) startTime = timestamp;
    let progress = Math.min((timestamp - startTime) / duration, 1);
    element.style.height = (targetHeight * easeQuadInOut(progress)) + "px";
    if (progress < 1) requestAnimationFrame(step);
    else {
      element.style.height = "auto";
      element.style.overflow = "";
      if (callback) callback();
    }
  }
  requestAnimationFrame(step);
}

function animateShrink(element, duration, callback) {
  const startHeight = element.offsetHeight;
  let startTime;
  function step(timestamp) {
    if (!startTime) startTime = timestamp;
    let progress = Math.min((timestamp - startTime) / duration, 1);
    element.style.height = (startHeight * (1 - easeQuadInOut(progress))) + "px";
    if (progress < 1) requestAnimationFrame(step);
    else {
      element.style.height = "0px";
      element.style.overflow = "hidden";
      element.style.visibility = "hidden";
      element.style.display = "none";
      element.removeAttribute("open");
      if (callback) callback();
    }
  }
  requestAnimationFrame(step);
}

function openDropdown(menu) {
  const parentDropdown = menu.closest("[dropdown='true']");
  const toggle = parentDropdown?.querySelector("[dropdown-toggle='true']");
  const icon = toggle?.querySelector("[dropdown-icon='true']");

  menu.style.visibility = "visible";
  menu.style.display = "flex";
  menu.style.overflow = "hidden";
  menu.style.height = "0px";
  menu.setAttribute("open", "");

  toggle?.classList.add("dropdown-open");
  if (icon) {
    icon.style.transition = "transform 250ms ease-in-out";
    icon.style.transform = "rotateX(180deg)";
  }

  animateGrow(menu, 250, () => {
    menu.style.height = "auto";
  });
}

function closeDropdown(menu) {
  const parentDropdown = menu.closest("[dropdown='true']");
  const toggle = parentDropdown?.querySelector("[dropdown-toggle='true']");
  const icon = toggle?.querySelector("[dropdown-icon='true']");

  menu.querySelectorAll("[dropdown-menu='true'][open]").forEach(nested => {
    closeDropdown(nested);
  });

  animateShrink(menu, 250, () => {
    toggle?.classList.remove("dropdown-open");
    if (icon) {
      icon.style.transition = "transform 250ms ease-in-out";
      icon.style.transform = "rotateX(0deg)";
    }
    menu.removeAttribute("open");
  });
}

function toggleDropdown(toggle, event) {
  const parentDropdown = toggle.closest("[dropdown='true']");
  const menu = parentDropdown.querySelector("[dropdown-menu='true']");
  if (!menu) return;

  if (toggle.tagName === "A") event.preventDefault();

  if (menu.hasAttribute("open")) {
    menu.dataset.userClosed = "true";
    closeDropdown(menu);
  } else {
    delete menu.dataset.userClosed;
    openDropdown(menu);
  }
}

// === CLICK EVENTS ===
document.addEventListener("click", e => {
  const toggle = e.target.closest("[dropdown-toggle='true']");
  if (toggle) {
    e.stopPropagation();
    toggleDropdown(toggle, e);
  }
});

document.addEventListener("click", e => {
  if (e.target.closest("[dropdown-menu='true']")) {
    e.stopPropagation();
  }
});

// === HOVER RE-INIT ===
function reinitializeDropdowns() {
  document.querySelectorAll("[dropdown=true]").forEach(dropdown => {
    const menu = dropdown.querySelector("[dropdown-menu='true']");
    const toggle = dropdown.querySelector("[dropdown-toggle='true']");
    if (!toggle || !menu) return;

    const shouldBeOpen = menu.getAttribute("dropdown-state") === "open";
    const containsSelected = menu.querySelector(".selected");

    if (shouldBeOpen || containsSelected) {
      menu.setAttribute("open", "");
      menu.style.visibility = "visible";
      menu.style.display = "flex";
      menu.style.height = "auto";
      toggle.classList.add("dropdown-open");

      const icon = toggle.querySelector("[dropdown-icon='true']");
      if (icon) {
        icon.style.transition = "transform 250ms ease-in-out";
        icon.style.transform = "rotateX(180deg)";
      }
    } else {
      menu.style.height = "0px";
      menu.style.visibility = "hidden";
      menu.style.display = "none";
      menu.removeAttribute("open");
    }

    if (dropdown.hasAttribute("dropdown-hover-out")) {
      dropdown.removeEventListener("mouseleave", hoverOutHandler);
      dropdown.addEventListener("mouseleave", hoverOutHandler);
    }
  });
}

function hoverOutHandler(e) {
  const dropdown = e.currentTarget;
  const menu = dropdown.querySelector("[dropdown-menu='true']");
  if (menu?.hasAttribute("open")) {
    closeDropdown(menu);
  }
}

new MutationObserver(reinitializeDropdowns).observe(document.body, {
  childList: true,
  subtree: true
});

reinitializeDropdowns();

// === .selected Class Observer ===
let lastSelectedId = null;

const observerSelected = new MutationObserver(() => {
  const currentSelected = document.querySelector("[dropdown-item-target].selected");
  if (!currentSelected) return;

  const newId = currentSelected.getAttribute("dropdown-item-target") || currentSelected.id;
  if (newId === lastSelectedId) return; // Nothing changed
  lastSelectedId = newId;

  // Get all dropdown menus that should be open based on the new .selected
  const menusToOpen = new Set();

  let currentMenu = currentSelected.closest("[dropdown-menu='true']");
  while (currentMenu) {
    menusToOpen.add(currentMenu);
    const parentDropdown = currentMenu.closest("[dropdown='true']");
    currentMenu = parentDropdown?.closest("[dropdown-menu='true']");
  }

  // 🔄 Reopen newly needed menus (ignore userClosed only if .selected moved)
  menusToOpen.forEach(menu => {
    if (menu.dataset.userClosed === "true") {
      delete menu.dataset.userClosed;
    }
    if (!menu.hasAttribute("open")) {
      openDropdown(menu);
      menu.dataset.autoOpened = "true";
    }
  });

  // 🔒 Close any other menus that were autoOpened but no longer needed
  document.querySelectorAll("[dropdown-menu='true'][open]").forEach(menu => {
    const isInMenusToOpen = menusToOpen.has(menu);
    const wasAutoOpened = menu.dataset.autoOpened === "true";

    if (wasAutoOpened && !isInMenusToOpen) {
      delete menu.dataset.autoOpened;
      closeDropdown(menu);
    }
  });
});



observerSelected.observe(document.body, {
  attributes: true,
  subtree: true,
  attributeFilter: ["class"]
});

// === Open Menus on First Page Load ===
const selectedEls = Array.from(document.querySelectorAll(".selected")).filter(el =>
  el.closest("[dropdown-tree]")
);
selectedEls.forEach(selected => {
  let currentMenu = selected.closest("[dropdown-menu='true']");
  while (currentMenu) {
    if (!currentMenu.hasAttribute("open")) {
      openDropdown(currentMenu);
      currentMenu.dataset.autoOpened = "true";
    }
    const parentDropdown = currentMenu.closest("[dropdown='true']");
    currentMenu = parentDropdown?.closest("[dropdown-menu='true']");
  }
});

window.openDropdown = openDropdown;
window.closeDropdown = closeDropdown;


// DROPDOWN FUNCTION ENDS ------------------------------------------------



    


    
    
    
    
        // DARK-MODE TOGGLE------------------------------------------------------------------------            
 
    const toggle = document.getElementById("dark-mode-toggle-primary");

    // Function to apply dark mode immediately
    function applyDarkMode(enabled) {
        const elements = document.querySelectorAll('[dark-mode="true"]');
        elements.forEach(el => {
            if (enabled) {
                el.classList.add("dark-mode");
            } else {
                el.classList.remove("dark-mode");
            }
        });

        if (toggle) {
            toggle.checked = enabled;

            // Find the nearest wrapper div (Adjust selector if needed)
            const wrapperDiv = toggle.closest(".dark-mode-toggle-wrapper") || toggle.parentElement;

            if (wrapperDiv && wrapperDiv.parentElement) {
                const siblingDivs = Array.from(wrapperDiv.parentElement.children);

                // Apply or remove the "selected" class on the wrapper and its siblings
                siblingDivs.forEach(div => {
                    if (enabled) {
                        div.classList.add("selected");
                    } else {
                        div.classList.remove("selected");
                    }
                });
            }
        }
    }

    // Check localStorage for dark mode preference
    const isDarkMode = localStorage.getItem("darkMode") === "enabled";

    // Apply dark mode before the page renders to prevent flickering
    applyDarkMode(isDarkMode);

    if (toggle) {
        toggle.addEventListener("change", function () {
            if (toggle.checked) {
                localStorage.setItem("darkMode", "enabled"); // Store preference
                applyDarkMode(true);
            } else {
                localStorage.removeItem("darkMode"); // Remove stored preference
                applyDarkMode(false);
            }
        });
    }
        // END OF DARK-MODE TOGGLE------------------------------------------------------------------------            




// POPUP ANIMATION------------------------------------------------------------------------            
// Easing functions
const easeOutQuad = t => t * (2 - t);
const easeInQuad = t => t * t;

// Animation utility
const animate = ({ element, from, to, duration, easing, property, onComplete }) => {
  const start = performance.now();

  const tick = now => {
    let progress = (now - start) / duration;
    if (progress > 1) progress = 1;

    const eased = easing(progress);
    const current = from + (to - from) * eased;

    if (property === "opacity") {
      element.style.opacity = current;
    } else if (property === "translateY") {
      element.style.transform = `translateZ(0) translateY(${current}rem)`; // ✅ Safe transform
    }

    if (progress < 1) {
      requestAnimationFrame(tick);
    } else if (onComplete) {
      onComplete();
    }
  };

  requestAnimationFrame(tick);
};

// Main logic to attach popup behavior
window.observePopups = () => {
  document.querySelectorAll('[popup=wrapper]').forEach(wrapper => {
    if (wrapper.__popupBound) return; // prevent duplicate binding
    wrapper.__popupBound = true;

    const popup = wrapper.querySelector('[popup=content]');
    if (popup) {
      popup.style.opacity = '0';
      popup.style.transform = 'translateZ(0) translateY(1rem)';
    }

    let enterTimeout;

    wrapper.addEventListener('mouseenter', () => {
      const popup = wrapper.querySelector('[popup=content]');
      if (!popup) return;

      enterTimeout = setTimeout(() => {
        popup.style.display = 'flex';
        popup.style.visibility = 'visible';
        popup.style.opacity = '0';

        // ✅ Only adjust z-index and transform (no position!)
        popup.style.zIndex = '99999';
        popup.style.transform = 'translateZ(0) translateY(1rem)';

        animate({
          element: popup,
          from: 0,
          to: 1,
          duration: 250,
          easing: t => t,
          property: 'opacity'
        });

        animate({
          element: popup,
          from: 1,
          to: 0,
          duration: 250,
          easing: easeOutQuad,
          property: 'translateY'
        });
      }, 500); // 0.5s delay
    });

    wrapper.addEventListener('mouseleave', () => {
      clearTimeout(enterTimeout);

      const popup = wrapper.querySelector('[popup=content]');
      if (!popup) return;

      animate({
        element: popup,
        from: 0,
        to: 1,
        duration: 250,
        easing: easeInQuad,
        property: 'translateY'
      });

      animate({
        element: popup,
        from: 1,
        to: 0,
        duration: 250,
        easing: t => t,
        property: 'opacity',
        onComplete: () => {
          popup.style.display = 'none';
          popup.style.visibility = 'hidden';

          // ✅ Reset styles carefully
          popup.style.zIndex = '';
          popup.style.transform = 'translateY(0)';
        }
      });
    });
  });
};

// Run it once on initial load
window.observePopups();

// OPTIONAL: Auto-setup new elements using MutationObserver
const observer = new MutationObserver(mutations => {
  for (const mutation of mutations) {
    if (mutation.addedNodes.length) {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === 1) {
          if (node.matches?.('[popup=wrapper]') || node.querySelector?.('[popup=wrapper]')) {
            observePopups();
          }
        }
      });
    }
  }
});

observer.observe(document.body, { childList: true, subtree: true });

// END OF POPUP ANIMATION------------------------------------------------------------------------            



        // OVERVIEW TILES GENERATION------------------------------------------------------------------------            
				const containers = document.querySelectorAll('[project-overview-tiles]');

  containers.forEach(container => {
    const rawInput = container.getAttribute('project-overview-tiles');
    let tilesToRender = [];

    try {
      tilesToRender = JSON.parse(rawInput);
      if (!Array.isArray(tilesToRender)) throw new Error("Input is not an array.");
    } catch (err) {
      console.error("Invalid project-overview-tiles input:", err);
      return;
    }

    const template = container.querySelector('[overview-tile="template"]');
    if (!template) {
      console.warn("No template found in container");
      return;
    }

    const clones = [];

    tilesToRender.forEach((tile, index) => {
      const clone = template.cloneNode(true);
      clone.removeAttribute("overview-tile");
      clone.setAttribute("data-index", index);
      if (tile.id) clone.setAttribute("item-id", tile.id);

      const titleEl = clone.querySelector('[overview-tile="title"]');
      const subtitleEl = clone.querySelector('[overview-tile="subtitle"]');

      if (titleEl) titleEl.textContent = tile.title ?? "";
      if (subtitleEl) subtitleEl.textContent = tile.subtitle ?? "";

      clone.style.display = ""; // Ensure it's visible
      clones.push(clone);
    });

    // Clear container and append tiles
    container.innerHTML = "";
    clones.forEach(clone => container.appendChild(clone));

    // Layout logic
    const applyLayout = () => {
      const tiles = Array.from(container.children);
      const tileCount = tiles.length;
      const isDesktop = window.innerWidth >= 1280;

      // Reset styles
      container.style.display = "";
      container.style.flexDirection = "";
      container.style.gridTemplateColumns = "";
      container.style.gridTemplateRows = "";
      tiles.forEach(tile => tile.style.gridColumn = "");

      if (!isDesktop) {
        container.style.display = "flex";
        container.style.flexDirection = "column";
        return;
      }

      container.style.display = "grid";

      // Detect if title is wrapped (multi-line)
      const isWrapped = (el) => {
        if (!el) return false;
        return el.getClientRects().length > 1;
      };

      const wrapInfo = tiles.map(tile => {
        const titleEl = tile.querySelector('[overview-tile="title"]');
        return isWrapped(titleEl);
      });

      const anyWrapped = wrapInfo.includes(true);

      if (!anyWrapped && tileCount <= 4) {
        container.style.gridTemplateColumns = `repeat(${tileCount}, 1fr)`;
      } else {
        container.style.gridTemplateColumns = "1fr 1fr";

        wrapInfo.forEach((wraps, i) => {
          if (wraps) {
            tiles[i].style.gridColumn = "span 2";
          }
        });

        if (tileCount % 2 === 1 && !wrapInfo[tileCount - 1]) {
          tiles[tileCount - 1].style.gridColumn = "span 2";
        }
      }
    };

    applyLayout();

    let resizeTimeout;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(applyLayout, 100);
    });
  });


    		
    
        // END OF OVERVIEW TILES GENERATION------------------------------------------------------------------------            











});
// END OF DOM EVENT LISTENER------------------------------------------------------------

