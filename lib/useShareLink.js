import { useCallback, useEffect } from "react";
import { encodeShareState, decodeShareState } from "./permalink";

// Restores a shared snippet from the URL hash on first load, and gives back
// a handler that copies the current snippet as a shareable link. Kept
// outside App so the mount-time restore logic isn't buried in a hook that
// also does a dozen other things.
export function useShareLink({ code, language, indentSize, onRestore, onNotify }) {
  useEffect(() => {
    const match = window.location.hash.match(/#share=(.+)$/);
    if (!match) return;

    const shared = decodeShareState(match[1]);
    if (!shared) {
      onNotify("⚠ That share link looks corrupted");
      return;
    }
    onRestore(shared);
    onNotify("📂 Loaded shared snippet");
    // only ever meant to run once, against whatever hash was present at load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const share = useCallback(() => {
    const payload = encodeShareState({ code, language, indentSize });
    const url = `${window.location.origin}${window.location.pathname}#share=${payload}`;
    navigator.clipboard
      .writeText(url)
      .then(() => onNotify("🔗 Share link copied to clipboard"))
      .catch(() => onNotify("⚠ Couldn't copy — clipboard access denied"));
  }, [code, language, indentSize, onNotify]);

  return { share };
}
