console.log("---- beep ----");
(async function () {
  "use strict";
  const DEBUG = false;
  log("-- start main from twitter-alt-text --");

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
      log("Can't find a  main article span");
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

  const MAX_DEPTH = 30;

  /**
   * @param {HTMLElement} el
   * @returns {HTMLElement[]}
   */
  async function enumerateTree(el, depth, first) {
    return new Promise(resolve => {
      depth = depth || 0;
      depth++;
      first = first || el;
      if (depth > MAX_DEPTH) {
        throw new Error(`gave up trying to enumerate tree from`, first);
      }
      const immediateChildren = Array.from(el.children);
      resolve(immediateChildren.reduce(
        (acc, cur) => {
          acc.push(enumerateTree(cur, depth, first));
          return acc;
        }, [el]).flat(
        Number.MAX_SAFE_INTEGER
      ));
    });
  }

  /**
   * @param {HTMLElement} haystack
   * @param {HTMLElement} needle
   */
  async function isAncestor(
    haystack,
    needle
  ) {
    const tree = await enumerateTree(haystack);
    return tree.indexOf(needle) > -1;
  }

  /**
   * @param {HTMLElement} needle
   * @param {string} selector
   * @returns {boolean}
   */
  async function isContainedInElementMatching(
    needle,
    selector
  ) {
    const selectorMatches = Array.from(document.querySelectorAll(selector));
    for (let cur of selectorMatches) {
      if (await isAncestor(cur, needle)) {
        return true;
      }
    }
    return false;
  }

  /**
   * @param {HTMLElement} el
   * @param {string} testId
   * @returns {boolean}
   */
  async function isContainedInElementWithTestId(
    el,
    testId
  ) {
    return logResult({
      label: "isContainedInElementWithTestId",
      args: [el, testId],
      result: await isContainedInElementMatching(el, `[testid='${ testId }']`)
    });
  }

  /**
   * @typedef {Object} LogResultInfo
   * @property {string} label
   * @property {*[]} args
   * @property {*} result
   */
  /**
   * @param info
   */
  function logResult(info) {
    log(info.label, info.args);
    return info.result;
  }

  function log() {
    if (!DEBUG) {
      return;
    }
    console.log.apply(console, Array.from(arguments));
  }

  /**
   * @param {HTMLImageElement} img
   */
  async function shouldIgnore(img) {
    return isNotImage(img) ||
      // ignore profile pictures
      isProfileImage(img) ||
      // ignore emoji images placed into tweets (which are a good thing)
      isEmbeddedEmoji(img) ||
      // profile page: overview of recent tweets / replies
      false; //await isContainedInElementWithTestId(img, "tweetPhoto");
  }

  /**
   * @param {HTMLImageElement} img
   */
  function isProfileImage(img) {
    const src = img.src || "";
    return src.match(/\/profile_images\//);
  }

  /**
   * @param {HTMLElement} node
   */
  function isNotImage(node) {
    return node.tagName !== "IMG";
  }

  /**
   * @param {HTMLImageElement} img
   */
  function isEmbeddedEmoji(img) {
    const src = img.src || "";
    return src.match(/\/emoji\//)
      || src.match(/twemoji-sprite/);
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

  const noAlts = new Set(["", "image"]);
  let seenImages = 0;

  /**
   * @param {HTMLImageElement} img
   */
  function tryAddAltTextFor(node) {
    const
      container = findParentWithLink(node),
      altText = (node.getAttribute("alt") || "").trim().toLowerCase(),
      el = document.createElement("div"),
      hasNoAltText = noAlts.has(altText),
      generatedText = hasNoAltText
        ? " Image has no alt-text "
        : `[ ${ altText } ]`;
    if (hasNoAltText) {
      const span = document.createElement("span");
      span.innerText = generatedText;
      el.appendChild(makeSadFace());
      el.appendChild(span);
      el.appendChild(makeSadFace());
    } else {
      el.innerText = generatedText;
    }
    if (!container) {
      console.error("Can't find a container for alt-text", node, el);
      return;
    }
    if (container.getAttribute("aria-hidden") === "true") {
      log("ignoring image as parent is marked as aria-hidden", node, el);
      return;
    }
    log("should add alt for", {
      generatedText,
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
    seenImages++;
    el.setAttribute("data-associated-to-image", seenImages);
    node.setAttribute("data-associated-to-alt", seenImages);
    container.appendChild(el);
    log("added element", el);
  }

  const observer = new MutationObserver((mutationsList, observer) => {
    try {
      for (const mutation of mutationsList) {
        if (mutation.type === "childList") {
          mutation.addedNodes.forEach(async (node) => {
            if (await shouldIgnore(node)) {
              return;
            }
            try {
              tryAddAltTextFor(node);
            } catch (e) {
              console.error("tryAddAltTextFor fails:", e);
            }
          });

          // // remove alt-texts when their associated images are removed
          // mutation.removedNodes.forEach(node => {
          //   if (shouldIgnore(node)) {
          //     return;
          //   }
          //   const
          //     associationId = node.getAttribute("data-associated-to-alt"),
          //     associated = Array.from(document.querySelectorAll(`[data-associated-to-image='${ associationId }']`));
          //   associated.forEach(el => el.remove());
          // });
        }
      }
    } catch (e) {
      console.error("mutation observer error", e);
    }
  });

  observer.observe(document.body, {
    subtree: true,
    childList: true
  });
  log("twitter-alt-text loaded");
})();
