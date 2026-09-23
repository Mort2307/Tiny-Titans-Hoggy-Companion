import { useMemo } from "react";
import type { Snake } from "../types/Snake";
import { buildSnakeProfileReviewGuide, buildAlwaysUsefulAreas } from "../lib/snakeProfileReviewGuide";

export function useSnakeProfileReviewGuide(snake: Snake) {
  const now=useMemo(()=>new Date(),[]);
  const data=useMemo(()=>buildSnakeProfileReviewGuide(snake,now),[snake,now]);
  const alwaysUseful=useMemo(()=>buildAlwaysUsefulAreas(snake),[snake]);
  return {data,alwaysUseful};
}