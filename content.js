// content.js

/**
 * Observes the DOM for new comment text editors and adds a suggestion button to them.
 */
const observer = new MutationObserver(() => {
  document.querySelectorAll(".comments-comment-texteditor:not([data-mutated])")
    .forEach((commentBox) => {
      commentBox.setAttribute("data-mutated", true);
      addSuggestionButton(commentBox);
    });
});

// Start observing the entire document body for changes.
observer.observe(document.body, { childList: true, subtree: true });

/**
 * Adds a "Suggest" button to the given comment box element.
 * @param {HTMLElement} commentBox The HTML element representing the comment text editor.
 */
const addSuggestionButton = async (commentBox) => {
  const suggestionButton = document.createElement("button");
  suggestionButton.innerText = "✍️";
  suggestionButton.classList.add(
    "artdeco-button",
    "artdeco-button--circle",
    "artdeco-button--muted",
    "artdeco-button--2",
    "artdeco-button--tertiary",
    "comments-comment-box__emoji-picker-trigger",
    "my-suggestion-button"
  );

  suggestionButton.addEventListener("click", async () => {
    const originalButtonText = suggestionButton.innerText; // Store original text
    const originalButtonClasses = suggestionButton.classList.value; // Store original classes

    try {
      // --- Show Loader ---
      suggestionButton.innerText = "Loading..."; // Change text
      suggestionButton.disabled = true; // Disable button to prevent multiple clicks
      suggestionButton.classList.add("loading-state"); // Add a class for potential CSS styling (e.g., spinner)

      const prompt = createPrompt(commentBox);

      const response = await chrome.runtime.sendMessage({
        action: "fetchSuggestion",
        prompt: prompt,
      });

      console.log("Response from background script:", response);

      if (response && response.success) {
        const suggestionText = response.suggestion;
        if (suggestionText) {
          const qlEditor = commentBox.querySelector(".ql-editor");
          if (qlEditor) {
            qlEditor.innerHTML = `<p>${suggestionText}</p>`;
            qlEditor.dispatchEvent(new Event("input", { bubbles: true }));
          }
        } else {
          console.warn("Background script returned no suggestion text.");
          // Optionally, inform the user more explicitly (e.g., alert)
          alert("Could not generate a suggestion. Please try again.");
        }
      } else {
        console.error(
          "Error from background script:",
          response ? response.error : "Unknown error"
        );
        alert(`Failed to get suggestion: ${response?.error || 'Unknown error. Check console.'}`);
      }
    } catch (error) {
      console.error("Error during suggestion request in content script:", error);
      alert("An unexpected error occurred. Please try again.");
    } finally {
      // --- Hide Loader ---
      suggestionButton.innerText = originalButtonText; // Restore original text
      suggestionButton.disabled = false; // Re-enable button
      suggestionButton.classList.remove("loading-state"); // Remove loading class
    }
  });

  const actionButtonsContainer = commentBox.querySelector(
    ".display-flex.justify-space-between > .display-flex"
  );
  const emojiButtonParentDiv = actionButtonsContainer?.querySelector("div");

  if (actionButtonsContainer && emojiButtonParentDiv) {
    actionButtonsContainer.insertBefore(suggestionButton, emojiButtonParentDiv);
  } else if (actionButtonsContainer) {
    actionButtonsContainer.prepend(suggestionButton);
  }
};

/**
 * Creates a prompt string based on the content and author of a LinkedIn post.
 * This function remains in the content script as it interacts with the DOM.
 * @param {HTMLElement} commentBox The comment box element, used to find the parent post.
 * @returns {string} The formatted prompt for the LLM.
 */
const createPrompt = (commentBox) => {
  const post =
    commentBox.closest(".feed-shared-update-v2") ||
    commentBox.closest(".feed-shared-update") ||
    commentBox.closest(".reusable-search__result-container");

  const author = post?.querySelector(
    ".update-components-actor__title .visually-hidden"
  )?.innerText;
  const content = post?.querySelector(
    ".fie-impression-container .feed-shared-inline-show-more-text"
  )?.innerText;

  const rules = `
  RULES:
    1. DO NOT add '\\n', '\\t' or other special character.
    2. DO NOT include link.
    3. Write short reply.
    4. DO NOT write any greeting.
    5. DO NOT write any salutation.
    6. DO NOT write any closing statement.
    7. DO NOT write any disclaimers.
  `;

  if (!content) {
    return `Please write a reply for a LinkedIn post by ${author || 'an unknown author'}.` + rules;
  }

  return `Please write a reply for this LinkedIn post: "${content}" by "${author || 'an unknown author'}".` + rules;
};