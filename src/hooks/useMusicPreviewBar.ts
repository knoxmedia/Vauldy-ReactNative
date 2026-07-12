import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";
import { useMusicPlayerStore } from "@/store/musicPlayer";

/** Hide the floating music bar during photo/document fullscreen preview; restore on exit. */
export function useMusicPreviewBar() {
  const setPreviewBarHidden = useMusicPlayerStore((s) => s.setPreviewBarHidden);

  useFocusEffect(
    useCallback(() => {
      setPreviewBarHidden(true);
      return () => setPreviewBarHidden(false);
    }, [setPreviewBarHidden]),
  );
}
