"use client";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Piece } from "./board";
import { useApp } from "./provider";
export function Missing() {
  const { t } = useApp();
  return (
    <div className="not-found">
      <Piece type="n" color="w" />
      <span className="eyebrow">404</span>
      <h1>{t("notFound")}</h1>
      <p>{t("notFoundText")}</p>
      <Link className="button primary" href="/">
        {t("backHome")}
        <ArrowRight size={18} />
      </Link>
    </div>
  );
}
