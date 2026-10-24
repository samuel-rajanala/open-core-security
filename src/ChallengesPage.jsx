import React from "react";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import ChallengeBoard from "./components/ChallengeBoard.jsx";
import PlanetScene from "./components/PlanetScene.jsx";

export default function ChallengesPage() {
  return <div className="site challenges-page">
    <PlanetScene />
    <div className="announcement"><i/> COMMUNITY-DRIVEN CYBERSECURITY <span>/</span> INDIA <b>CONTROLLED LABS · LEARN BY DOING</b></div>
    <header className="header">
      <a className="brand" href={import.meta.env.BASE_URL}><span className="mark">✳</span><span>OPEN CORE<small>SECURITY</small></span></a>
      <nav className="nav challenges-nav">
        <a href={import.meta.env.BASE_URL}>Home</a>
        <a href={import.meta.env.BASE_URL + "#domains"}>Domains</a>
        <a href={import.meta.env.BASE_URL + "#community"}>Community</a>
      </nav>
    </header>
    <main>
      <section className="wrap challenges-hero">
        <div className="kicker">04 / PRACTICAL LEARNING</div>
        <h1>Enter the <em>challenge lab.</em></h1>
        <p>Choose a challenge, inspect the evidence, learn the security concepts, and submit your flag. Every exercise runs in a controlled simulation.</p>
        <div className="challenges-trust"><ShieldCheck size={16}/> AUTHORIZED, SIMULATED EXERCISES ONLY <span>·</span> LEARN RESPONSIBLY</div>
      </section>
      <ChallengeBoard />
    </main>
    <footer className="footer wrap">
      <div className="footer-top"><a className="brand" href={import.meta.env.BASE_URL}><span className="mark">✳</span><span>OPEN CORE<small>SECURITY</small></span></a><p>Think. Test. Learn. Defend.</p><a href="https://github.com/samuel-rajanala/open-core-security" target="_blank" rel="noreferrer">GITHUB ↗</a></div>
      <div className="footer-bottom"><span>© {new Date().getFullYear()} OPEN CORE SECURITY</span><span>INDEPENDENT COMMUNITY INITIATIVE · INDIA</span><a href="#">BACK TO TOP ↑</a></div>
    </footer>
  </div>;
}
