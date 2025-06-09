// service_worker.js

/**
 * Handles incoming messages from content scripts.
 * Specifically listens for a 'fetchSuggestion' action.
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "fetchSuggestion") {
    const { prompt } = request;

    // Call the API function directly in the background script
    fetchSuggestionFromOllama(prompt)
      .then((suggestion) => {
        sendResponse({ success: true, suggestion: suggestion });
      })
      .catch((error) => {
        console.error(
          "Error in background script while fetching suggestion:",
          error
        );
        sendResponse({ success: false, error: error.message });
      });

    return true; // Keep the message channel open for async response
  }
});

/**
 * Fetches a suggestion from the Ollama API with detailed logging.
 * @param {string} prompt The text prompt to send to the LLM.
 * @returns {Promise<string|null>} A promise that resolves to the extracted reply as a string, or null on failure.
 */
const fetchSuggestionFromOllama = async (prompt) => {
  const baseUrl = "http://localhost:11434/api/generate";
  const requestStartTime = new Date(); // Timestamp for request start
  const requestId = crypto.randomUUID(); // Unique ID for this request

  const model_data = {
    model: "gemma3",
    prompt: prompt,
    format: "json",
    stream: false,
    options: {
      temperature: 0,
    },
    // Ensure this matches Ollama's expected schema for structured JSON
    // Note: The 'format' field was duplicated, I've fixed it to 'response_format'
    // based on common Ollama structured output usage. If your Ollama version/model
    // expects 'format' for this, revert the key but ensure no duplication.
    response_format: {
      type: "json_object", // Ollama might expect this for structured JSON
      schema: {
        type: "object",
        properties: {
          reply: {
            type: "string",
          },
        },
        required: ["reply"],
      },
    },
  };

  try {
    console.group(`Ollama Request [ID: ${requestId}]`);
    console.log(`Request Timestamp: ${requestStartTime.toISOString()}`);
    console.log("Endpoint:", baseUrl);
    console.log("Request Payload:", model_data);
    console.time(`Request Duration [ID: ${requestId}]`); // Start timer

    const response = await fetch(baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(model_data),
    });

    const requestEndTime = new Date(); // Timestamp for response received
    console.timeEnd(`Request Duration [ID: ${requestId}]`); // End timer and log duration
    console.log(`Response Timestamp: ${requestEndTime.toISOString()}`);
    console.log(`Status Code: ${response.status}`);
    console.log(`Status Text: ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `Ollama API HTTP error! Status: ${response.status}, Message: ${errorText}`
      );
      throw new Error(`API error: ${response.status} - ${errorText.substring(0, 100)}...`); // Throw more detailed error
    }

    const data = await response.json();
    let extractedReply = null;

    console.log("Raw Ollama API Response Data:", data);

    if (!data || typeof data !== "object") {
      console.warn("Ollama API response is not a valid object or is empty.");
      return null;
    }

    if (
      "response" in data &&
      data.response !== null &&
      data.response !== undefined
    ) {
      let potentialJsonString = data.response;
      let parsedResponseObject;

      if (typeof potentialJsonString === "string") {
        try {
          parsedResponseObject = JSON.parse(potentialJsonString);
        } catch (e) {
          console.warn(
            "Ollama's 'response' field is a string but not valid JSON. Attempting to use as raw text.",
            potentialJsonString
          );
          extractedReply = potentialJsonString.trim();
        }
      } else if (typeof potentialJsonString === "object") {
        parsedResponseObject = potentialJsonString;
      } else {
        console.warn(
          `Ollama's 'response' field has an unexpected type: ${typeof potentialJsonString}`
        );
        return null;
      }

      if (
        parsedResponseObject &&
        typeof parsedResponseObject === "object" &&
        "reply" in parsedResponseObject
      ) {
        if (typeof parsedResponseObject.reply === "string") {
          extractedReply = parsedResponseObject.reply.trim();
          if (extractedReply === "") {
            console.warn("The 'reply' property from Ollama is an empty string.");
            return null;
          }
        } else {
          console.warn(
            "The 'reply' property from Ollama is not a string (e.g., it's a nested object)."
          );
          return null;
        }
      } else if (
        extractedReply === null &&
        typeof potentialJsonString === "string"
      ) {
        extractedReply = potentialJsonString.trim();
        console.log(
          "Using 'data.response' as the direct string reply (no 'reply' key found):",
          extractedReply
        );
      }

      if (extractedReply) {
        console.log("Final Extracted Reply:", extractedReply);
        return extractedReply;
      } else {
        console.warn(
          "Could not extract a valid 'reply' from the Ollama API response."
        );
        return null;
      }
    } else {
      console.warn(
        "The 'response' property is missing, null, or undefined in the Ollama API data."
      );
      return null;
    }
  } catch (error) {
    console.error("Failed to fetch suggestion from Ollama:", error);
    return null;
  } finally {
    console.groupEnd(); // End the console group for this request
  }
};