
document.addEventListener("DOMContentLoaded", () => {
  const scrollOffset = window.innerHeight * 0.4;
  const scrollContainer = document.getElementById("page");
  const hasScrollContainer = !!scrollContainer;
  if (!hasScrollContainer) {
    console.warn("No #page scroll container found. Scroll sync and content-tree scroll behavior will be skipped.");
  }

  const fadeDuration = 300;
  const urlParams = new URLSearchParams(window.location.search);
  const selectedId = urlParams.get("selection");

  const usedIdMap = {};
  const dropdownLinks = [];
  
  function decodeHtmlEntities(encodedStr) {
    const txt = document.createElement("textarea");
    txt.innerHTML = encodedStr;
    return txt.value;
  }

  
  
  function getNormalizedURL(url) {
  try {
    const parsed = new URL(url);
    const cleanPath = parsed.pathname.replace(/\/$/, '').toLowerCase();
    return parsed.origin + cleanPath;
      } catch {
        return url;
      }
    }


const currentPageURL = getNormalizedURL(window.location.origin + window.location.pathname).toLowerCase();
const MAX_TREE_DEPTH = 5;




  // ================================
  // 1. CONTENT-TREE RENDERING
  // ================================

  const sourceContainer = document.querySelector("[content-tree-items='true']");
  if (!sourceContainer) return;

  const sourceMap = {};
  sourceContainer.querySelectorAll("[id]").forEach(el => {
    sourceMap[el.id] = el;
  });
  
  // ✅ Also scan for standalone content-tree elements inside sourceContainer
sourceContainer.querySelectorAll("[content-tree]").forEach(nestedTreeHost => {
  const raw = nestedTreeHost.getAttribute("content-tree");
  if (!raw) return;

  try {
    const treeData = JSON.parse(decodeHtmlEntities(raw));
    const builtItems = [];
    treeData.order.forEach(entry => {
      const nested = buildNested(entry, sourceMap, usedIdMap);
      nested.forEach(item => builtItems.push(item));
    });
    const target = nestedTreeHost.querySelector("[nesting-target='true']") || nestedTreeHost;
    builtItems.forEach(el => target.appendChild(el));
  } catch (e) {
    console.warn("⚠️ Invalid content-tree JSON in independent nested element:", nestedTreeHost);
  }
});


  document.querySelectorAll("[content-tree]").forEach(container => {
    const groupId = container.getAttribute("content-tree-group") || "default";

    let treeData;
        try {
          const raw = container.getAttribute("content-tree");
          treeData = JSON.parse(decodeHtmlEntities(raw));
        } catch (e) {
          console.warn("Invalid content-tree JSON");
          return;
        }


    const fragment = document.createDocumentFragment();
    const topLevelIds = [];

    treeData.order.forEach(entry => {
      const builtItems = buildNested(entry, sourceMap, usedIdMap);
      builtItems.forEach(built => {
  if (!built.id) return;
  built.style.opacity = "0";
  built.style.transition = `opacity ${fadeDuration}ms ease`;
  built.style.display = "none";
  built.classList.add("content-tree-item");
  topLevelIds.push(built.id);
  fragment.appendChild(built);

  // ✅ Check if this item has its own content-tree attribute
  const nestedAttr = built.getAttribute("content-tree");
  if (nestedAttr) {
    try {
      const nestedTree = JSON.parse(decodeHtmlEntities(nestedAttr));
      const nestedItems = [];
      nestedTree.order.forEach(nestedEntry => {
        const nested = buildNested(nestedEntry, sourceMap, usedIdMap);
        nested.forEach(item => nestedItems.push(item));
      });
      const target = built.querySelector("[nesting-target='true']") || built;
      nestedItems.forEach(el => target.appendChild(el));
    } catch (e) {
      console.warn("⚠️ Invalid nested content-tree JSON on built item:", built.id);
    }
  }
});

    });


    container.innerHTML = "";
    container.appendChild(fragment);
    initializePercentageTracks(container);
    container.__topLevelIds = topLevelIds;

    const grouped = container.hasAttribute("content-tree-group") && hasGroupTabs(groupId);

    // ================================
    // 1A. SELECTION / INITIAL DISPLAY
    // ================================

    if (grouped) {
      let activeId = topLevelIds[0];
      let scrollTargetId = null;

      if (selectedId) {
        const selectedEl = container.querySelector("#" + selectedId);
        const topLevelEl = selectedEl?.closest(".content-tree-item");
        if (selectedEl && topLevelEl) {
          activeId = topLevelEl.id;
          scrollTargetId = selectedId;
        }
      }

      showItem(container, activeId, groupId);

      if (hasScrollContainer && scrollTargetId && scrollTargetId !== activeId) {
        const targetEl = container.querySelector("#" + scrollTargetId);
        if (targetEl) {
          requestAnimationFrame(() => {
            const containerTop = scrollContainer.getBoundingClientRect().top;
            const itemTop = targetEl.getBoundingClientRect().top;
            const offset = itemTop - containerTop - scrollOffset;
            scrollContainer.scrollTo({ top: scrollContainer.scrollTop + offset, behavior: "smooth" });
          });
        }
      }
    } else {
      // Show ALL top-level items
      topLevelIds.forEach(id => {
        const el = container.querySelector("#" + id);
        if (el) {
          el.style.display = "";
          requestAnimationFrame(() => { el.style.opacity = "1"; });
          el.classList.add("cm-visible");
        }
      });
    }

    // ================================
    // 1B. TAB NAVIGATION LOGIC
    // ================================

    document.querySelectorAll(`[content-tree-tab][content-tree-group="${groupId}"]`).forEach(btn => {
      btn.addEventListener("click", () => {
        const visible = container.querySelector(".cm-visible");
        const currentId = visible?.id || topLevelIds[0];
        const currentIndex = topLevelIds.indexOf(currentId);
        if (currentIndex === -1) return;

        const dir = btn.getAttribute("content-tree-tab") === "next" ? 1 : -1;
        const nextIndex = currentIndex + dir;
        if (nextIndex < 0 || nextIndex >= topLevelIds.length) return;

        const nextId = topLevelIds[nextIndex];
        hideItem(container.querySelector("#" + currentId), () => {
          showItem(container, nextId, groupId);
          updateURLSelection(nextId);
          setTimeout(() => syncDropdownHighlightNow(), 50);
        });
      });
    });
  });

  sourceContainer.remove();

  // ================================
  // 1C. BUILD NESTED STRUCTURE RECURSIVELY
  // ================================

function buildNested(entry, sourceMap, usedMap, depth = 0, visitedIds = new Set()) {
  const indent = "  ".repeat(depth); // For visual hierarchy in logs

  if (!entry || typeof entry !== "object" || !entry.id) {
    return [];
  }

  if (depth > MAX_TREE_DEPTH) {
    console.warn(`❌ Max depth exceeded (${MAX_TREE_DEPTH}) for entry:`, entry);
    return [];
  }

  if (visitedIds.has(entry.id)) {
    console.warn(`❌ Recursive loop detected for ID: ${entry.id}`);
    return [];
  }
  visitedIds.add(entry.id);

  const baseId = entry.id;
  const usedList = usedMap[baseId] || [];
  const instanceCount = usedList.length;
  const newId = instanceCount === 0 ? baseId : `${baseId}-${instanceCount + 1}`;

  const children = Array.isArray(entry.children) ? entry.children : [];

  if (!sourceMap[baseId]) {
    return children.flatMap(child => buildNested(child, sourceMap, usedMap, depth + 1, new Set(visitedIds)));
  }

  const clone = sourceMap[baseId].cloneNode(true);
  // ✅ Inject customField1/2/3 into matching elements
  ["customField1", "customField2", "customField3"].forEach(fieldKey => {
    if (entry[fieldKey]) {
      try {
        // Do NOT search inside nesting-target
        const possibleTargets = Array.from(clone.querySelectorAll(`[content-tree-field="${fieldKey}"]`));
        const nestingTarget = clone.querySelector("[nesting-target='true']");
        const validTargets = nestingTarget
          ? possibleTargets.filter(el => !nestingTarget.contains(el))
          : possibleTargets;

        validTargets.forEach(el => {
          el.textContent = entry[fieldKey];
        });
      } catch (e) {
        console.warn(`⚠️ Error applying ${fieldKey} for ${baseId}:`, e);
      }
    }
  });

  clone.id = newId;

  if (!usedMap[baseId]) usedMap[baseId] = [];
  usedMap[baseId].push(newId);

  const nestedChildren = children.flatMap(child =>
    buildNested(child, sourceMap, usedMap, depth + 1, new Set(visitedIds))
  );

  // ✅ Handle nested content-tree inside this node BEFORE returning
  if (clone.hasAttribute("content-tree")) {
    try {
      const nestedTreeData = JSON.parse(decodeHtmlEntities(clone.getAttribute("content-tree")));
      const nestedFragment = document.createDocumentFragment();
      nestedTreeData.order.forEach(nestedEntry => {
        const nestedItems = buildNested(nestedEntry, sourceMap, usedMap, depth + 1, new Set(visitedIds));
        nestedItems.forEach(item => nestedFragment.appendChild(item));
      });
      const nestedTarget = clone.querySelector("[nesting-target='true']") || clone;
      nestedTarget.appendChild(nestedFragment);
    } catch (e) {
      console.warn(`⚠️ Invalid nested content-tree JSON in ${clone.id}`);
    }
  }

  const target = clone.querySelector("[nesting-target='true']");
  if (target) {
    nestedChildren.forEach(el => {
      if (el instanceof Element) {
        target.appendChild(el);
      }
    });
    return [clone];
  }

  if (nestedChildren.length > 0) {
    return [clone, ...nestedChildren];
  }

  return [clone];
}





  function showItem(container, id, groupId) {
    const el = container.querySelector("#" + id);
    if (!el) return;

    el.style.display = "";
    requestAnimationFrame(() => { el.style.opacity = "1"; });
    el.classList.add("cm-visible");

    const topIds = container.__topLevelIds || [];
    const currentIndex = topIds.indexOf(id);

    document.querySelectorAll(`[content-tree-tab="previous"][content-tree-group="${groupId}"]`).forEach(btn => {
      btn.style.display = currentIndex <= 0 ? "none" : "";
    });
    document.querySelectorAll(`[content-tree-tab="next"][content-tree-group="${groupId}"]`).forEach(btn => {
      btn.style.display = currentIndex >= topIds.length - 1 ? "none" : "";
    });
  }

  function hideItem(el, callback) {
    if (!el) return;
    el.style.opacity = "0";
    setTimeout(() => {
      el.style.display = "none";
      el.classList.remove("cm-visible");
      if (callback) callback();
    }, fadeDuration);
  }

  function updateURLSelection(id) {
    const params = new URLSearchParams(window.location.search);
    params.set("selection", id);
    const newURL = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, "", newURL);
  }

  function hasGroupTabs(groupId) {
    return document.querySelectorAll(`[content-tree-tab][content-tree-group="${groupId}"]`).length > 0;
  }

  // If no content-tree was used, fallback to populating usedIdMap from dropdown-tree
  if (Object.keys(usedIdMap).length === 0) {
    document.querySelectorAll("[dropdown-tree]").forEach(container => {
      let tree;
      try {
        const rawDropdown = container.getAttribute("dropdown-tree");
        tree = JSON.parse(decodeHtmlEntities(rawDropdown));
      } catch (e) {
        return;
      }
      const countMap = {};
      function countIds(entry) {
        if (!entry?.id) return;
        countMap[entry.id] = (countMap[entry.id] || 0) + 1;
        if (Array.isArray(entry.children)) {
          entry.children.forEach(child => countIds(child));
        }
      }
      tree.order.forEach(entry => countIds(entry));
      for (const [id, count] of Object.entries(countMap)) {
        usedIdMap[id] = [];
        for (let i = 0; i < count; i++) {
          usedIdMap[id].push(i === 0 ? id : `${id}-${i + 1}`);
        }
      }
    });
  }

  window.contentTreeIdMap = usedIdMap;

  // ================================
  // 2. DROPDOWN-TREE GENERATION
  // ================================

  document.querySelectorAll("[dropdown-tree]").forEach(container => {
    let tree;
    try {
      const rawDropdown = container.getAttribute("dropdown-tree");
        tree = JSON.parse(decodeHtmlEntities(rawDropdown));

    } catch (e) {
      console.warn("Invalid dropdown-tree JSON");
      return;
    }

    const itemTemplate = container.querySelector("[dropdown-item='true']");
    const groupTemplate = container.querySelector("[dropdown-group='true']");
    if (!itemTemplate || !groupTemplate) return;

    const renderedItems = [];
    const instanceTracker = {};

    const treePagelink = getNormalizedURL(tree.pagelink || "");
    const isSamePage = treePagelink === currentPageURL;

    tree.order.forEach(entry => {
      const built = buildDropdownEntry(entry, itemTemplate, groupTemplate, usedIdMap, instanceTracker, isSamePage);
      if (built) renderedItems.push(...(Array.isArray(built) ? built : [built]));
    });

    renderedItems.flat().forEach(el => {
      if (el instanceof Element) {
        itemTemplate.parentElement.appendChild(el);
      } else {
        console.warn("Skipped non-element in rendered dropdown items:", el);
      }
    });

    itemTemplate.remove();
    groupTemplate.remove();
  });

  function buildDropdownEntry(entry, itemTemplate, groupTemplate, idMap, instanceTracker, isSamePage) {
  // Skip if completely malformed
  if (!entry?.id || !entry?.title) {
    // console.warn("⛔ Skipping invalid dropdown entry (missing id or title):", entry);
    return null;
  }

  const baseId = entry.id;
  const usedIds = idMap[baseId] || [baseId];
  const index = instanceTracker[baseId] || 0;
  const actualId = usedIds[index] || baseId;
  instanceTracker[baseId] = index + 1;

    const baseLink = entry.link?.split("?")[0] || "";
    const href = baseLink ? `${baseLink}?selection=${actualId}` : "#";



  const dropdownFlag = entry.dropdown !== false;
  const hasChildren = Array.isArray(entry.children) && entry.children.length > 0;

  const visibleChildren = hasChildren
    ? entry.children
        .map(child => buildDropdownEntry(child, itemTemplate, groupTemplate, idMap, instanceTracker, isSamePage))
        .filter(el => el instanceof Node || (Array.isArray(el) && el.every(n => n instanceof Node)))
    : [];

  if (!dropdownFlag && visibleChildren.length > 0) {
    return visibleChildren;
  }

  if (dropdownFlag && visibleChildren.length > 0) {
    const groupClone = groupTemplate.cloneNode(true);
    const titleEl = groupClone.querySelector("[dropdown-item-title='true']");
    if (titleEl) titleEl.textContent = entry.title;

    const menuTarget = groupClone.querySelector("[dropdown-menu='true']");
    if (menuTarget) {
      visibleChildren.forEach(child => {
        if (Array.isArray(child)) {
          child.forEach(n => n instanceof Node && menuTarget.appendChild(n));
        } else if (child instanceof Node) {
          menuTarget.appendChild(child);
        }
      });
    }

    return groupClone;
  }

  if (dropdownFlag && visibleChildren.length === 0) {
    return buildDropdownItem(entry, itemTemplate, href, actualId, isSamePage);
  }

  // If dropdown: false and no children, render nothing
  return null;
}



  function buildDropdownItem(entry, template, href, actualId, isSamePage) {
  const clone = template.cloneNode(true);
  const title = clone.querySelector("[dropdown-item-title='true']");
  const link = clone.querySelector("[dropdown-item-link='true']");
  const target = clone.querySelector("[dropdown-item-target]");
  const newtabIcon = clone.querySelector("[dropdown-newtab-icon='true']");

  if (title) title.textContent = entry.title;
  if (target) {
    target.setAttribute("dropdown-item-target", actualId);
    if (isSamePage) dropdownLinks.push(target);
  }

  const entryBaseLink = getNormalizedURL(entry.link || "");
  const currentBaseURL = getNormalizedURL(window.location.href);
  const isSamePageLink = entryBaseLink === currentBaseURL;
  const openInNewTab = entry.newtab === true;

  if (isSamePageLink || !entry.link) {
    // Internal navigation (same page)
    if (link) {
      link.removeAttribute("href");
      link.style.cursor = "pointer";
      link.addEventListener("click", () => {
        const allContainers = document.querySelectorAll("[content-tree]");
        for (const container of allContainers) {
          const topIds = container.__topLevelIds || [];
          const targetEl = container.querySelector("#" + actualId);
          const topLevelEl = targetEl?.closest(".content-tree-item");
          if (topLevelEl && topIds.includes(topLevelEl.id)) {
            hideItem(container.querySelector(".cm-visible"), () => {
              showItem(container, topLevelEl.id, container.getAttribute("content-tree-group") || "default");
              updateURLSelection(actualId);
              setTimeout(() => {
                const scrollTarget = container.querySelector("#" + actualId);
                if (scrollTarget && hasScrollContainer) {
                  const containerTop = scrollContainer.getBoundingClientRect().top;
                  const itemTop = scrollTarget.getBoundingClientRect().top;
                  const offset = itemTop - containerTop - scrollOffset;
                  scrollContainer.scrollTo({ top: scrollContainer.scrollTop + offset, behavior: "smooth" });
                }
                syncDropdownHighlightNow();
              }, 50);
            });
            break;
          }
        }
      });
    }
  } else {
    // External navigation
    if (link) {
      link.setAttribute("href", href);
      if (openInNewTab) {
        link.setAttribute("target", "_blank");
        if (newtabIcon) newtabIcon.style.display = "flex";
      }
    }
  }

  return clone;
}


  // ================================
  // 3. SCROLL-BASED .SELECTED SYNC
  // ================================

  let ticking = false;

  function isVisible(el) {
    return el.offsetParent !== null;
  }

  function findNearestVisibleId() {
    const containerTop = scrollContainer.getBoundingClientRect().top;
    const containerBottom = scrollContainer.getBoundingClientRect().bottom;

    const visibleSections = Array.from(document.querySelectorAll("[content-tree] .content-tree-item")).filter(isVisible);
    const validTargetIds = new Set(
  Array.from(document.querySelectorAll("[dropdown-tree]"))
    .filter(el => {
      try {
        const raw = el.getAttribute("dropdown-tree") || "{}";
        const parsed = JSON.parse(decodeHtmlEntities(raw));
        const normalized = getNormalizedURL(parsed.pagelink || "");
        return !parsed.pagelink || normalized === currentPageURL;
      } catch (e) {
        console.warn("⚠️ Failed to parse dropdown-tree during scroll sync", e);
        return false;
      }
    })
    .flatMap(el =>
      Array.from(el.querySelectorAll("[dropdown-item-target]")).map(link => link.getAttribute("dropdown-item-target"))
    )
);



    const visibleContentItems = visibleSections.flatMap(section => {
      const list = [section];
      const nested = Array.from(section.querySelectorAll("[id]"));
      return list.concat(nested);
    }).filter(el => validTargetIds.has(el.id));

    let closestId = null;
    let closestDistance = Infinity;

    visibleContentItems.forEach(el => {
      if (!el.id) return;
      const rect = el.getBoundingClientRect();
      const elTop = rect.top;
      const elBottom = rect.bottom;

      const isInView = elBottom >= containerTop + scrollOffset * 0.25 &&
                       elTop <= containerBottom - scrollOffset * 0.25;

      if (isInView) {
        const distanceToCenter = Math.abs(rect.top - (containerTop + scrollOffset));
        if (distanceToCenter < closestDistance) {
          closestId = el.id;
          closestDistance = distanceToCenter;
        }
      }
    });

    return closestId;
  }

  function updateSelectedDropdown(activeId) {
    dropdownLinks.forEach(link => {
      const targetId = link.getAttribute("dropdown-item-target");
      if (targetId === activeId) {
        link.classList.add("selected");
      } else {
        link.classList.remove("selected");
      }
    });
  }

  function syncDropdownHighlightNow() {
    const activeId = findNearestVisibleId();
    updateSelectedDropdown(activeId);
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      syncDropdownHighlightNow();
      ticking = false;
    });
  }

  if (hasScrollContainer) {
    scrollContainer.addEventListener("scroll", onScroll);
    requestAnimationFrame(() => syncDropdownHighlightNow());
  }

  window.syncDropdownHighlightNow = syncDropdownHighlightNow;
});




// ================================
// 4. PDF DOWNLOAD FUNCTIONALITY
// ================================

document.querySelectorAll('[content-tree-element="download-pdf"]').forEach(button => {
  button.addEventListener("click", async () => {
    const groupId = button.getAttribute("content-tree-group");
    if (!groupId) {
      console.warn("No content-tree-group specified for download-pdf button.");
      return;
    }

    const treeContainer = document.querySelector(`[content-tree][content-tree-group="${groupId}"]`);
    const overlay = document.querySelector(`[content-tree-element="download-overlay"][content-tree-group="${groupId}"]`);

    if (!treeContainer) {
      console.warn(`No content-tree found for group "${groupId}".`);
      return;
    }

    if (overlay) {
      overlay.style.display = "flex"; // Show overlay while preparing
    }

    const originalVisibilityStates = [];
    const originalStyles = {
      width: treeContainer.style.width,
      maxWidth: treeContainer.style.maxWidth,
      margin: treeContainer.style.margin,
      padding: treeContainer.style.padding,
    };

    const originalChildrenStyles = [];
treeContainer.querySelectorAll('.content-tree-item').forEach(el => {
  originalChildrenStyles.push({
    el: el,
    breakInside: el.style.breakInside,
    pageBreakInside: el.style.pageBreakInside,
  });
  el.style.breakInside = 'avoid';
  el.style.pageBreakInside = 'avoid';
});

    // Make all top-level sections visible
    const topLevelItems = treeContainer.querySelectorAll(".content-tree-item");
    topLevelItems.forEach(item => {
      originalVisibilityStates.push({
        element: item,
        display: item.style.display,
        opacity: item.style.opacity,
        wasVisible: item.classList.contains("cm-visible")
      });
      item.style.display = "";
      item.style.opacity = "1";
    });

    // Set width to match new printable area exactly
    treeContainer.style.width = '768px';        // 8" printable width = 768px at 96dpi
    treeContainer.style.maxWidth = 'none';
    treeContainer.style.margin = '0';
    treeContainer.style.padding = '0';

    await new Promise(resolve => setTimeout(resolve, 300));

    try {
      await html2pdf().from(treeContainer).set({
        margin: [0.25, 0.25, 0.25, 0.25], // Top, Left, Bottom, Right margins
        filename: `${groupId || 'content'}.pdf`,
        image: { type: 'jpeg', quality: 1 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          scrollX: 0,
          scrollY: 0,
          x: 0,
          y: 0,
          width: 768,          // New render width
          windowWidth: 768,
        },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
      }).save();
    } catch (err) {
      console.error("Error generating PDF:", err);
    }

    // Restore original visibility
    originalVisibilityStates.forEach(({ element, display, opacity, wasVisible }) => {
      element.style.display = display;
      element.style.opacity = opacity;
      if (!wasVisible) {
        element.classList.remove("cm-visible");
      }
    });

    // Restore break settings
    originalChildrenStyles.forEach(({ el, breakInside, pageBreakInside }) => {
      el.style.breakInside = breakInside;
      el.style.pageBreakInside = pageBreakInside;
    });

    // Restore original styles
    treeContainer.style.width = originalStyles.width;
    treeContainer.style.maxWidth = originalStyles.maxWidth;
    treeContainer.style.margin = originalStyles.margin;
    treeContainer.style.padding = originalStyles.padding;

    if (overlay) {
      overlay.style.display = "none"; // Hide overlay again
    }
  });
});
