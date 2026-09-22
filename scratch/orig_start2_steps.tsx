Created At: 2026-09-22T12:43:42+06:00
Completed At: 2026-09-22T12:43:42+06:00
File Path: `file:///c:/Users/SHAMIM/Documents/GitHub/ora/client/components/marketing/start2/start2-steps.tsx`
Total Lines: 485
Total Bytes: 19747
Showing lines 1 to 485
The following code has been modified to include a line number before every line, in the format: <line_number>: <original_line>. Please note that any changes targeting the original code should remove the line number, colon, and leading space.
1: 'use client';
2: 
3: import React, { useState, useEffect, useRef } from 'react';
4: import { 
5:   Globe, 
6:   Check, 
7:   Copy, 
8:   CheckCircle2, 
9:   Sliders, 
10:   Code, 
11:   Play,
12:   Pause,
13:   ShieldCheck,
14:   Sparkles,
15:   Layers,
16:   Zap,
17:   ArrowRight
18: } from 'lucide-react';
19: 
20: interface PlatformOption {
21:   id: string;
22:   name: string;
23:   placeholder: string;
24:   count: string;
25: }
26: 
27: const PLATFORMS: PlatformOption[] = [
28:   { id: 'shopify', name: 'Shopify', placeholder: 'yourstore.myshopify.com', count: '248 items' },
29:   { id: 'woo', name: 'WooCommerce', placeholder: 'store.domain.com/wp-json', count: '180 items' },
30:   { id: 'api', name: 'Custom Feed', placeholder: 'api.store.com/v1/products', count: '520 items' },
31: ];
32: 
33: export function Start2Steps() {
34:   const [activeStep, setActiveStep] = useState(0);
35:   const [scrollProgress, setScrollProgress] = useState(0.15);
36:   const [isAutoStepping, setIsAutoStepping] = useState(false);
37:   const [selectedPlatform, setSelectedPlatform] = useState<string>('shopify');
38:   const [urgencyEnabled, setUrgencyEnabled] = useState(true);
39:   const [oneClickEnabled, setOneClickEnabled] = useState(true);
40:   const [copied, setCopied] = useState(false);
41: 
42:   const timelineRef = useRef<HTMLDivElement>(null);
43:   const stepRefs = [
44:     useRef<HTMLDivElement>(null),
45:     useRef<HTMLDivElement>(null),
46:     useRef<HTMLDivElement>(null)
47:   ];
48: 
49:   // Scroll tracking to drive dynamic timeline beam fill & step detection
50:   useEffect(() => {
51:     const handleScroll = () => {
52:       if (!timelineRef.current) return;
53:       const rect = timelineRef.current.getBoundingClientRect();
54:       const windowHeight = window.innerHeight;
55:       
56:       // Calculate scroll progress through the timeline container
57:       const totalHeight = rect.height;
58:       const currentPos = (windowHeight * 0.45) - rect.top;
59:       const progress = Math.max(0.1, Math.min(1, currentPos / totalHeight));
60:       setScrollProgress(progress);
61: 
62:       if (!isAutoStepping) {
63:         if (progress < 0.38) {
64:           setActiveStep(0);
65:         } else if (progress < 0.72) {
66:           setActiveStep(1);
67:         } else {
68:           setActiveStep(2);
69:         }
70:       }
71:     };
72: 
73:     window.addEventListener('scroll', handleScroll, { passive: true });
74:     handleScroll();
75:     return () => window.removeEventListener('scroll', handleScroll);
76:   }, [isAutoStepping]);
77: 
78:   // Optional auto-progression mode
79:   useEffect(() => {
80:     if (!isAutoStepping) return;
81: 
82:     const timer = setInterval(() => {
83:       setActiveStep((prev) => (prev + 1) % 3);
84:     }, 4500);
85: 
86:     return () => clearInterval(timer);
87:   }, [isAutoStepping]);
88: 
89:   const scrollToStep = (index: number) => {
90:     setIsAutoStepping(false);
91:     setActiveStep(index);
92:     const target = stepRefs[index].current;
93:     if (target) {
94:       target.scrollIntoView({ behavior: 'smooth', block: 'center' });
95:     }
96:   };
97: 
98:   const handleCopy = () => {
99:     navigator.clipboard.writeText('<script src="https://cdn.ora.ai/widget/loader.js" data-ora-id="biz_live_891" async></script>');
100:     setCopied(true);
101:     setTimeout(() => setCopied(false), 2000);
102:   };
103: 
104:   const currentPlatform = PLATFORMS.find(p => p.id === selectedPlatform) || PLATFORMS[0];
105: 
106:   return (
107:     <section className="s2-steps-section" id="how-it-works" role="region" aria-label="Setup timeline: three steps to launch">
108:       <div className="s2-container">
109:         
110:         {/* Section Header: Sentence Case, Zero Eyebrows, Clean & Authoritative */}
111:         <div className="s2-section-head text-center">
112:           <h2 className="s2-section-title">
113:             Three steps to launch
114:           </h2>
115:           <p className="s2-section-sub">
116:             From store catalog to live voice sales in under 3 minutes.
117:           </p>
118: 
119:           {/* Timeline Jump Pills & Auto-Play Control */}
120:           <div className="s2-timeline-nav-row">
121:             <button
122:               type="button"
123:               onClick={() => scrollToStep(0)}
124:               className={`s2-timeline-nav-pill ${activeStep === 0 ? 'active' : ''}`}
125:               aria-pressed={activeStep === 0}
126:             >
127:               <span className="s2-nav-pill-num">01</span>
128:               <span>Connect</span>
129:             </button>
130:             <button
131:               type="button"
132:               onClick={() => scrollToStep(1)}
133:               className={`s2-timeline-nav-pill ${activeStep === 1 ? 'active' : ''}`}
134:               aria-pressed={activeStep === 1}
135:             >
136:               <span className="s2-nav-pill-num">02</span>
137:               <span>Configure</span>
138:             </button>
139:             <button
140:               type="button"
141:               onClick={() => scrollToStep(2)}
142:               className={`s2-timeline-nav-pill ${activeStep === 2 ? 'active' : ''}`}
143:               aria-pressed={activeStep === 2}
144:             >
145:               <span className="s2-nav-pill-num">03</span>
146:               <span>Launch</span>
147:             </button>
148: 
149:             {/* Play/Pause Demonstration Toggle */}
150:             <button
151:               type="button"
152:               onClick={() => setIsAutoStepping(!isAutoStepping)}
153:               className="s2-timeline-play-btn"
154:               aria-label={isAutoStepping ? 'Pause timeline progression' : 'Play timeline progression'}
155:               title={isAutoStepping ? 'Pause auto-cycle' : 'Auto-cycle demonstration'}
156:             >
157:               {isAutoStepping ? <Pause size={11} /> : <Play size={11} />}
158:             </button>
159:           </div>
160:         </div>
161: 
162:         {/* Vertical Connected Timeline Wrapper */}
163:         <div className="s2-timeline-wrapper" ref={timelineRef}>
164:           
165:           {/* Continuous Vertical Timeline Spine */}
166:           <div className="s2-timeline-spine-track" aria-hidden="true">
167:             {/* Background inactive track */}
168:             <div className="s2-spine-base-line" />
169:             
170:             {/* Illuminated dynamic fill beam */}
171:             <div 
172:               className="s2-spine-fill-beam"
173:               style={{ height: `${Math.min(100, Math.max(10, scrollProgress * 100))}%` }}
174:             />
175: 
176:             {/* Animated energetic travelling spark */}
177:             <div 
178:               className="s2-spine-spark-particle"
179:               style={{ top: `${Math.min(98, Math.max(2, scrollProgress * 100))}%` }}
180:             />
181:           </div>
182: 
183:           {/* =================================================================
184:               TIMELINE STAGE 01: CONNECT STORE CATALOG
185:              ================================================================= */}
186:           <div 
187:             ref={stepRefs[0]}
188:             className={`s2-timeline-stage ${activeStep === 0 ? 'stage-active' : ''}`}
189:             onClick={() => setActiveStep(0)}
190:           >
191:             {/* Left Node Milestone */}
192:             <div className="s2-timeline-milestone">
193:               <div className="s2-milestone-aura" />
194:               <div className="s2-milestone-circle">
195:                 <span className="s2-milestone-num">01</span>
196:               </div>
197:               <div className="s2-milestone-branch" />
198:             </div>
199: 
200:             {/* Stage Body Grid: Left Info & Right Mockup */}
201:             <div className="s2-timeline-card-grid">
202:               
203:               {/* Left Column: Context & Spec Tags */}
204:               <div className="s2-timeline-info">
205:                 <div className="s2-stage-meta-row">
206:                   <span className="s2-stage-status-chip active">Phase 01 · Catalog Sync</span>
207:                 </div>
208:                 <h3 className="s2-stage-title">Connect store catalog</h3>
209:                 <p className="s2-stage-desc">
210:                   Authorize via 1-click Shopify OAuth or WooCommerce REST API. ORA automatically parses your products, variants, real-time stock levels, and store return policies.
211:                 </p>
212:                 <div className="s2-stage-tags">
213:                   <span className="s2-stage-tag">Shopify &amp; WooCommerce</span>
214:                   <span className="s2-stage-tag">Live Webhook Sync</span>
215:                   <span className="s2-stage-tag">&lt; 90s Ingestion</span>
216:                 </div>
217:               </div>
218: 
219:               {/* Right Column: Live Interactive Ingestion Deck */}
220:               <div className="s2-timeline-mockup">
221:                 <div className="s2-deck-top">
222:                   <div className="s2-platform-switcher">
223:                     {PLATFORMS.map((plat) => (
224:                       <button
225:                         key={plat.id}
226:                         type="button"
227:                         onClick={(e) => {
228:                           e.stopPropagation();
229:                           setSelectedPlatform(plat.id);
230:                           setActiveStep(0);
231:                         }}
232:                         className={`s2-micro-platform-chip ${selectedPlatform === plat.id ? 'active' : ''}`}
233:                       >
234:                         <span>{plat.name}</span>
235:                       </button>
236:                     ))}
237:                   </div>
238:                   <span className="s2-deck-ping-dot" title="Live connector active" />
239:                 </div>
240: 
241:                 {/* URL Input Box */}
242:                 <div className="s2-step-url-box">
243:                   <Globe size={13} className="text-muted-foreground flex-shrink-0" />
244:                   <span className="s2-url-text">{currentPlatform.placeholder}</span>
245:                   <span className="s2-sync-badge">Sync</span>
246:                 </div>
247: 
248:                 {/* Live Sync Progress Visual */}
249:                 <div className="s2-step-progress-box">
250:                   <div className="flex justify-between items-center text-[11px] font-mono mb-1">
251:                     <span className="text-muted-foreground">Catalog sync</span>
252:                     <span className="text-[#16A34A] dark:text-[#C8F031] font-bold">{currentPlatform.count} ready</span>
253:                   </div>
254:                   <div className="s2-mini-progress-bar">
255:                     <div className="s2-progress-fill" />
256:                   </div>
257:                 </div>
258: 
259:                 {/* Status Verification Chips */}
260:                 <div className="s2-step-chips-footer">
261:                   <div className="s2-status-chip">
262:                     <CheckCircle2 size={11} className="text-[#16A34A] dark:text-[#C8F031]" />
263:                     <span>Real-time stock hook</span>
264:                   </div>
265:                   <div className="s2-status-chip">
266:                     <CheckCircle2 size={11} className="text-[#16A34A] dark:text-[#C8F031]" />
267:                     <span>Store policies indexed</span>
268:                   </div>
269:                 </div>
270:               </div>
271: 
272:             </div>
273:           </div>
274: 
275:           {/* =================================================================
276:               TIMELINE STAGE 02: CONFIGURE CONVERSATION RULES
277:              ================================================================= */}
278:           <div 
279:             ref={stepRefs[1]}
280:             className={`s2-timeline-stage ${activeStep === 1 ? 'stage-active' : ''}`}
281:             onClick={() => setActiveStep(1)}
282:           >
283:             {/* Left Node Milestone */}
284:             <div className="s2-timeline-milestone">
285:               <div className="s2-milestone-aura" />
286:               <div className="s2-milestone-circle">
287:                 <span className="s2-milestone-num">02</span>
288:               </div>
289:               <div className="s2-milestone-branch" />
290:             </div>
291: 
292:             {/* Stage Body Grid: Left Info & Right Mockup */}
293:             <div className="s2-timeline-card-grid">
294:               
295:               {/* Left Column: Context & Spec Tags */}
296:               <div className="s2-timeline-info">
297:                 <div className="s2-stage-meta-row">
298:                   <span className="s2-stage-status-chip">Phase 02 · Sales Playbook</span>
299:                 </div>
300:                 <h3 className="s2-stage-title">Tune rules &amp; urgency</h3>
301:                 <p className="s2-stage-desc">
302:                   Establish brand tone, out-of-stock alternative policies, and low-inventory urgency triggers. Zero hallucinations guaranteed through catalog-bound RAG.
303:                 </p>
304:                 <div className="s2-stage-tags">
305:                   <span className="s2-stage-tag">Sub-350ms Turnaround</span>
306:                   <span className="s2-stage-tag">Zero Hallucinations</span>
307:                   <span className="s2-stage-tag">SMS Checkout Ready</span>
308:                 </div>
309:               </div>
310: 
311:               {/* Right Column: Tactile Switch Deck */}
312:               <div className="s2-timeline-mockup">
313:                 <div className="s2-mock-toggles">
314:                   {/* Toggle 1: Stock Urgency */}
315:                   <div 
316:                     className="s2-toggle-row clickable"
317:                     onClick={(e) => {
318:                       e.stopPropagation();
319:                       setUrgencyEnabled(!urgencyEnabled);
320:                       setActiveStep(1);
321:                     }}
322:                   >
323:                     <div>
324:                       <span className="s2-toggle-name">Stock Urgency</span>
325:                       <span className="s2-toggle-sub">Alert shopper when &le; 3 units left</span>
326:                     </div>
327:                     <div className={`s2-toggle-switch ${urgencyEnabled ? 'on' : 'off'}`}>
328:                       <div className="s2-switch-knob" />
329:                     </div>
330:                   </div>
331: 
332:                   {/* Toggle 2: Instant Checkout */}
333:                   <div 
334:                     className="s2-toggle-row clickable"
335:                     onClick={(e) => {
336:                       e.stopPropagation();
337:                       setOneClickEnabled(!oneClickEnabled);
338:                       setActiveStep(1);
339:                     }}
340:                   >
341:                     <div>
342:                       <span className="s2-toggle-name">Instant Checkout Link</span>
343:                       <span className="s2-toggle-sub">Pre-filled cart dispatched mid-call</span>
344:                     </div>
345:                     <div className={`s2-toggle-switch ${oneClickEnabled ? 'on' : 'off'}`}>
346:                       <div className="s2-switch-knob" />
347:                     </div>
348:                   </div>
349: 
350:                   {/* Grounding Shield Status */}
351:                   <div className="s2-toggle-row locked">
352:                     <div>
353:                       <span className="s2-toggle-name">Zero Hallucinations Shield</span>
354:                       <span className="s2-toggle-sub">Catalog truth strictly bound</span>
355:                     </div>
356:                     <span className="s2-locked-tag">
357:                       <ShieldCheck size={12} />
358:                       <span>Locked</span>
359:                     </span>
360:                   </div>
361:                 </div>
362: 
363:                 {/* Rules Ready Status Tag */}
364:                 <div className="s2-rules-ready-badge">
365:                   <Sparkles size={12} />
366:                   <span>Sales playbook active · Grounded speech engine</span>
367:                 </div>
368:               </div>
369: 
370:             </div>
371:           </div>
372: 
373:           {/* =================================================================
374:               TIMELINE STAGE 03: EMBED ASYNC SCRIPT & GO LIVE
375:              ================================================================= */}
376:           <div 
377:             ref={stepRefs[2]}
378:             className={`s2-timeline-stage ${activeStep === 2 ? 'stage-active' : ''}`}
379:             onClick={() => setActiveStep(2)}
380:           >
381:             {/* Left Node Milestone */}
382:             <div className="s2-timeline-milestone">
383:               <div className="s2-milestone-aura" />
384:               <div className="s2-milestone-circle">
385:                 <span className="s2-milestone-num">03</span>
386:               </div>
387:               <div className="s2-milestone-branch" />
388:             </div>
389: 
390:             {/* Stage Body Grid: Left Info & Right Mockup */}
391:             <div className="s2-timeline-card-grid">
392:               
393:               {/* Left Column: Context & Spec Tags */}
394:               <div className="s2-timeline-info">
395:                 <div className="s2-stage-meta-row">
396:                   <span className="s2-stage-status-chip">Phase 03 · Production Go-Live</span>
397:                 </div>
398:                 <h3 className="s2-stage-title">Embed snippet &amp; launch</h3>
399:                 <p className="s2-stage-desc">
400:                   Paste one 18KB asynchronous tag into your store header or Google Tag Manager. Shadow DOM architecture guarantees zero theme collision and zero PageSpeed impact.
401:                 </p>
402:                 <div className="s2-stage-tags">
403:                   <span className="s2-stage-tag">18KB Bundle</span>
404:                   <span className="s2-stage-tag">Shadow DOM</span>
405:                   <span className="s2-stage-tag">0 Speed Penalty</span>
406:                 </div>
407:               </div>
408: 
409:               {/* Right Column: Code Snippet & Copy Action */}
410:               <div className="s2-timeline-mockup">
411:                 <div className="s2-mockup-top flex items-center justify-between mb-2">
412:                   <span className="text-[11px] font-mono text-muted-foreground">Universal Tag</span>
413:                   <span className="s2-live-indicator">
414:                     <span className="s2-live-pulse-dot" />
415:                     <span>Ready to paste</span>
416:                   </span>
417:                 </div>
418: 
419:                 {/* Code Snippet Box */}
420:                 <div className="s2-mock-code-box">
421:                   <code className="text-[11px] leading-relaxed">
422:                     &lt;script src=&quot;https://cdn.ora.ai/widget/loader.js&quot; <br />
423:                     &nbsp;&nbsp;data-ora-id=&quot;biz_live_891&quot; async&gt;&lt;/script&gt;
424:                   </code>
425:                 </div>
426: 
427:                 {/* Interactive Copy Button */}
428:                 <button 
429:                   type="button" 
430:                   onClick={(e) => {
431:                     e.stopPropagation();
432:                     handleCopy();
433:                     setActiveStep(2);
434:                   }}
435:                   className="s2-copy-btn"
436:                   aria-label="Copy snippet to clipboard"
437:                 >
438:                   {copied ? <Check size={13} /> : <Copy size={13} />}
439:                   <span>{copied ? 'Copied to Clipboard!' : 'Copy Script Tag'}</span>
440:                 </button>
441: 
442:                 {/* Frontend Guarantee Strip */}
443:                 <div className="s2-step-chips-footer mt-2">
444:                   <div className="s2-status-chip">
445:                     <span>18KB gzip</span>
446:                   </div>
447:                   <div className="s2-status-chip">
448:                     <span>Zero layout shift</span>
449:                   </div>
450:                   <div className="s2-status-chip">
451:                     <span>Universal compatibility</span>
452:                   </div>
453:                 </div>
454:               </div>
455: 
456:             </div>
457:           </div>
458: 
459:         </div>
460: 
461:         {/* Slender Telemetry Stat Strips (Inspired by one_agent.png) */}
462:         <div className="s2-steps-stats-bar">
463:           <div className="s2-stat-pill">
464:             <span className="s2-stat-pill-num">1</span>
465:             <span className="s2-stat-pill-text">script tag to go live</span>
466:           </div>
467:           <div className="s2-stat-pill">
468:             <span className="s2-stat-pill-num">312ms</span>
469:             <span className="s2-stat-pill-text">average voice turnaround</span>
470:           </div>
471:           <div className="s2-stat-pill">
472:             <span className="s2-stat-pill-num">100%</span>
473:             <span className="s2-stat-pill-text">catalog grounded truth</span>
474:           </div>
475:           <div className="s2-stat-pill">
476:             <span className="s2-stat-pill-num">0</span>
477:             <span className="s2-stat-pill-text">theme code modifications</span>
478:           </div>
479:         </div>
480: 
481:       </div>
482:     </section>
483:   );
484: }
485: 
The above content shows the entire, complete file contents of the requested file.
