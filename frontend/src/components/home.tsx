"use client";
import Link from "next/link";
import { Chess } from "chess.js";
import {
  Swords,
  ArrowRight,
  ArrowUpRight,
  Monitor,
  Users,
  Target,
  Flame,
  ShieldCheck,
  BookOpen,
} from "lucide-react";
import { useApp } from "./provider";
import { Board } from "./board";
import { GameList } from "./game-list";
import { puzzles } from "@/lib/puzzles";
import { useOnline } from "./online-provider";
export function Home() {
  const { t, data } = useApp();
  const { text } = useOnline();
  const preview = new Chess(
    "r1bq1rk1/ppp2ppp/2np1n2/4p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 0 1",
  );
  return (
    <div className="page home-page">
      <div className="page-heading home-heading">
        <div>
          <p className="eyebrow">{t("dashboard")}</p>
          <h1>
            {data.profile.name ? `${data.profile.name}, ` : ""}
            {t("welcome")}
          </h1>
          <p>{t("welcomeSub")}</p>
        </div>
        <span className="demo-badge">
          <span />
          {t("demo")}
        </span>
      </div>
      {data.active && !data.active.result && (
        <Link href="/play" className="resume-banner">
          <Swords size={18} />
          <span>{t("activeElsewhere")}</span>
          <ArrowRight size={17} />
        </Link>
      )}
      <section className="hero">
        <div className="hero-copy">
          <span className="hero-kicker">
            <span />
            {t("club")}
          </span>
          <h2>{t("heroTitle")}</h2>
          <p>{t("heroText")}</p>
          <Link className="button hero-button" href="/play">
            {t("start")}
            <ArrowRight size={19} />
          </Link>
          <div className="hero-footnote">
            <span className="mini-pieces">♙ ♞ ♜</span>
            <span>{t("noRating")}</span>
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <span className="orbit orbit-one" />
          <span className="orbit orbit-two" />
          <div className="hero-board">
            <Board chess={preview} small disabled />
          </div>
          <span className="hero-art-caption">
            <i /> e4. {t("tagline")}
          </span>
        </div>
      </section>
      <div className="home-grid">
        <div className="home-left">
          <div className="section-heading">
            <h2>{t("quick")}</h2>
            <span>01 —</span>
          </div>
          <div className="challenge-grid">
            <Link className="challenge-card" href="/play?mode=computer">
              <div className="challenge-top">
                <span className="feature-icon">
                  <Monitor size={24} />
                </span>
                <ArrowUpRight size={20} />
              </div>
              <h3>{t("computer")}</h3>
              <p>{t("computerHelp")}</p>
              <span className="card-bottom">
                <span className="level-dots">
                  <i />
                  <i />
                  <i />
                </span>
                {t("easy")} · {t("medium")} · {t("hard")}
              </span>
            </Link>
            <Link className="challenge-card friend-card" href="/friends">
              <div className="challenge-top">
                <span className="feature-icon">
                  <Users size={24} />
                </span>
                <ArrowUpRight size={20} />
              </div>
              <h3>{t("local")}</h3>
              <p>{text.onlineHelp}</p>
              <span className="card-bottom">
                <span className="small-dot" />
                {text.friends}
              </span>
            </Link>
          </div>
          <div className="section-heading recent-heading">
            <h2>{t("recent")}</h2>
            <Link href="/profile">
              {t("viewAll")}
              <ArrowRight size={14} />
            </Link>
          </div>
          <GameList games={data.history.slice(0, 3)} compact />
        </div>
        <div className="home-right">
          <section className="puzzle-preview">
            <div className="section-heading">
              <span className="eyebrow">
                <Target size={14} />
                {t("puzzleDay")}
              </span>
              <span className="tag">{t("beginner")}</span>
            </div>
            <div className="puzzle-preview-content">
              <div className="puzzle-mini">
                <Board chess={new Chess(puzzles[0].fen)} small disabled />
              </div>
              <div>
                <h3>{t("puzzlePreview")}</h3>
                <p>{t("puzzleDesc")}</p>
              </div>
            </div>
            <Link href="/puzzles" className="puzzle-link">
              {t("solve")}
              <ArrowRight size={17} />
            </Link>
          </section>
          <section className="journey panel">
            <div className="section-heading">
              <h2>{t("progress")}</h2>
              <Flame size={18} />
            </div>
            <div className="journey-stats">
              <div>
                <strong>{data.history.length.toLocaleString()}</strong>
                <span>{t("games")}</span>
              </div>
              <div>
                <strong>
                  {data.solved.length}
                  <small>/ 6</small>
                </strong>
                <span>{t("solved")}</span>
              </div>
            </div>
            <div className="progress-track">
              <span style={{ width: `${(data.solved.length / 6) * 100}%` }} />
            </div>
            <p>
              <ShieldCheck size={13} />
              {t("device")}
            </p>
          </section>
        </div>
      </div>
      <section className="thought">
        <span className="quote-mark">“</span>
        <div>
          <span className="eyebrow">{t("tip")}</span>
          <p>{t("tipText")}</p>
        </div>
        <span className="thought-end">
          {t("tipBy")}
          <BookOpen size={20} />
        </span>
      </section>
    </div>
  );
}
