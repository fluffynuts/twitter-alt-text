(async function () {
  "use strict";
  console.log("-- start main from twitter-alt-text --");

  function findParentWithLink(node) {
    let current = node.parentElement;
    while (!current.querySelector("a[role='link']")) {
      current = current.parentElement;
      if (!current) {
        return null;
      }
    }
    return current;
  }

  let cachedTextStyles;

  /**
   * @typedef {object} StyleInfo
   * @property {string} color
   * @property {string} fontFamily
   * @property {string} fontSize
   */
  /**
   * @returns {StyleInfo|null}
   */
  function findTextStyles() {
    if (cachedTextStyles) {
      return cachedTextStyles;
    }
    const els = Array.from(document.querySelectorAll("main article span"));
    if (!els.length) {
      console.log("Can't find a  main article span");
      return null;
    }
    const firstWithColor = els.find(el => !!window.getComputedStyle(el).color);
    if (!firstWithColor) {
      console.error("Can't find anything with colors on", els);
      return null;
    }
    const computed = window.getComputedStyle(firstWithColor);
    return cachedTextStyles = {
      color: computed.color,
      fontFamily: computed.fontFamily,
      fontSize: computed.fontSize
    };
  }

  function makeSadFace() {
    const sad = document.createElement("img");
    sad.src = "https://abs-0.twimg.com/emoji/v2/svg/1f622.svg";
    sad.alt = "Crying face";
    sad.setAttribute("draggable", "false");
    sad.style.width = "16px";
    sad.style.height = "16px";
    return sad;
  }

  const noAlts = new Set([ "", "image" ]);
  /**
   * @param {HTMLImageElement} img
   */
  function tryAddAltTextFor(node) {

    const src = node.src || "";
    if (src.match(/\/profile_images\//)) {
      // ignore profile pictures
      return;
    }
    if (src.match(/\/emoji\//)) {
      // ignore emoji images placed into tweets (which are a good thing)
      return;
    }
    const
      container = findParentWithLink(node),
      altText = (node.getAttribute("alt") || "").trim().toLowerCase(),
      el = document.createElement("div"),
      hasNoAltText = noAlts.has(altText);
    if (hasNoAltText) {
      const span = document.createElement("span");
      span.innerText = " Image has no alt-text ";
      el.appendChild(makeSadFace());
      el.appendChild(span);
      el.appendChild(makeSadFace());
    } else {
      el.innerText = `[ ${altText} ]`;
    }
    console.log({
      hasNoAltText,
      altText,
      noAlts
    });
    if (!container) {
      console.error("Can't find a container for alt-text", node, el);
      return;
    }
    if (container.getAttribute("aria-hidden") === "true") {
      console.log("ignoring image as parent is marked as aria-hidden", node, el);
      return;
    }
    console.log("should add alt for", {
      node,
      container,
      el
    });
    el.classList.add("generated-alt-text-view");
    const styles = findTextStyles();
    if (styles) {
      Object.keys(styles).forEach(k => {
        el.style[k] = styles[k];
      });
    }
    el.style.padding = "5px 10px";
    el.style.fontStyle = "italic";
    container.appendChild(el);
    console.log("added element", el);
  }

  const observer = new MutationObserver((mutationsList, observer) => {
    for (const mutation of mutationsList) {
      if (mutation.type === "childList") {
        mutation.addedNodes.forEach(node => {
          if (node.tagName !== "IMG") {
            return;
          }
          // TODO: respond to image deletes (eg thumbnails for videos)
          // TODO: tie alt text elements to their corresponding images so we
          //       can remove them too
          try {
            tryAddAltTextFor(node);
          } catch (e) {
            console.error("tryAddAltTextFor fails:", e);
          }
        });
      }
    }
  });

  observer.observe(document.body, {
    subtree: true,
    childList: true
  });
  console.log("twitter-alt-text loaded");
})();
