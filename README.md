# LinkedIn Reply Suggester

A Chrome extension that helps you craft thoughtful replies to LinkedIn posts using Ollama's AI models.

## Features

- 📝 One-click reply suggestions for LinkedIn posts
- 🧠 Powered by local Ollama AI models
- 🔒 Privacy-focused (all processing happens locally)
- ⚡ Fast response times
- 🎨 Clean UI integration with LinkedIn

## Installation

1. Clone this repository or download the ZIP file
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked" and select the `linkedin-extension` folder
5. The extension is now installed and ready to use

## Usage

1. Start your Ollama server with CORS enabled:
   ```sh
   OLLAMA_ORIGINS=chrome-extension://* ollama serve
   ```

2. Navigate to LinkedIn and look for the ✍️ button next to the emoji button in comment boxes
3. Click the button to generate a contextually relevant reply suggestion
4. The suggested text will automatically appear in the comment box
5. Edit as needed and post your comment

## Requirements

- Chrome browser
- [Ollama](https://ollama.ai/) installed locally
- A compatible AI model (default: gemma3)

## Configuration

The extension is configured to use the `gemma3` model by default. To use a different model, modify the `model` parameter in `service_worker.js`.

## How It Works

1. The extension adds a suggestion button to LinkedIn comment boxes
2. When clicked, it captures the context of the post
3. The context is sent to your local Ollama server
4. Ollama generates a relevant reply
5. The reply is inserted into the comment box

## Troubleshooting

- **No suggestions appear**: Make sure Ollama is running with CORS enabled
- **Error messages**: Check the browser console for detailed error logs
- **Slow responses**: Consider using a smaller model or optimizing your Ollama setup

## Privacy

This extension:
- Only processes data on your local machine
- Does not send data to any external servers (only to your local Ollama instance)
- Does not track your browsing activity

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.