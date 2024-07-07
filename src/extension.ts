import * as vscode from "vscode";

let isEnabled = false;
let lastFocusTime = Date.now();

export function activate(context: vscode.ExtensionContext) {
  console.log("Focus Change Command extension is now active");

  let lastEditor: vscode.TextEditor | undefined;

  // Function to check if there is no selection in the active text editor (there is always an item in selection for me, but
  // it's always the same as the cursor position, so we can check if the cursor position is the same as the selection start
  function hasSelection() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      console.log("No active text editor");
      return false;
    }

    const { selection } = editor;
    const { e, c, f, g } = selection as any; // Where did those come from? 

    return (c.c !== e.c || c.e !== e.e) && (f.c && f.c !== g.c || g.e !== f.e);
  }

  // Function to run when focus changes
  const onFocusChange = ({ editor, windowState}: {
    editor?: vscode.TextEditor;
    windowState?: vscode.WindowState;
  }) => {
    const now = Date.now();

    if (now - lastFocusTime > 100) {
      const config = vscode.workspace.getConfiguration("focusChangeCommand");
      const triggerOnSameEditor = config.get<boolean>("triggerOnSameEditor");
      // Check if the listener is enabled and the editor is available unless the
      // triggerOnSameEditor is enabled (that is the command should run even if
      // the editor is the same as the last one) but not when something is
      // selected (for some reason something is always selected even if it's
      // just one character!) so that we don't break Vim's visual mode
      // selection.
      if ((!isEnabled || !editor)  &&
    hasSelection()) {
        return;
      }
      

      // Debounce to avoid multiple triggers
      lastFocusTime = now;

      const commandId = config.get<string>("commandId");

      if (commandId) {
        if (triggerOnSameEditor || editor !== lastEditor) {
          vscode.commands.executeCommand(commandId).then(undefined, (error) => {
            vscode.window.showErrorMessage(
              `Failed to execute command: ${error}`
            );
          });
          lastEditor = editor;
        }
      } else {
        vscode.window.showWarningMessage(
          "No command ID set for Focus Change Command. Please set one in the settings."
        );
      }
    }
  };

  // Register the focus change listeners
  const disposables = [
    vscode.window.onDidChangeWindowState((windowState) => {
      return onFocusChange({windowState});
    }),
    vscode.window.onDidChangeActiveTextEditor((editor) =>
      onFocusChange({editor})
    ),
  ];

  // Command to toggle the focus change listener
  let toggleCommand = vscode.commands.registerCommand(
    "focus-change-command.toggle",
    () => {
      isEnabled = !isEnabled; // Toggle the state
      if (!isEnabled) {
        // Show information message when disabled
        vscode.window.showInformationMessage(
          "Focus Change Command is now disabled"
        );
      }
    }
  );

  // Execute the toggle command on startup to enable the listener
  vscode.commands.executeCommand("focus-change-command.toggle");

  context.subscriptions.push(...disposables, toggleCommand);
}

export function deactivate() {}
