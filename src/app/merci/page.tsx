"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Merci() {
  const router = useRouter();

  useEffect(() => {
    const params = window.location.search;
    router.replace(`/obrigado${params}`);
  }, [router]);

  return null;
}
