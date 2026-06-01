'use client';

import { useState, useEffect, useRef } from "react";

/**
 * Provider `contents` 배열과 선택 탭을 동기화.
 * rename 시 동일 인덱스의 새 명칭으로 따라갑니다.
 */
export function useSyncedContentSelection(contents) {
  const list = Array.isArray(contents) ? contents : [];
  const [selected, setSelected] = useState(() => list[0] ?? "");
  const prevContentsRef = useRef(list);

  useEffect(() => {
    if (!list.length) return;
    const prevList = prevContentsRef.current || [];
    setSelected((prev) => {
      if (prev && list.includes(prev)) return prev;
      const idx = prevList.indexOf(prev);
      if (idx >= 0 && idx < list.length) return list[idx];
      // 배열이 늘어난 경우(신규 컨텐츠 추가) 마지막 항목이 새로 붙은 이름이면 선택
      if (list.length > prevList.length) {
        const added = list.find((name) => !prevList.includes(name));
        if (added) return added;
      }
      return list[0];
    });
    prevContentsRef.current = list;
  }, [contents]);

  return [selected, setSelected];
}
