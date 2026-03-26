<template>
  <div class="glass-panel" style="max-width: 1200px; margin: 0 auto; min-height: 85vh;" v-if="!isFullscreen">
    <!-- Header & Tabs -->
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
      <h2 style="margin: 0;">Trainer Dashboard</h2>
      <div style="color: #64748b;">
        <span :style="{display:'inline-block',width:'8px',height:'8px',borderRadius:'50%',marginRight:'6px',background:connected?'#10b981':'#ef4444'}" :title="connected?'Connected':'Disconnected'"></span>
        {{ user?.username }} ({{ user?.team }}) |
        <a href="#" @click.prevent="toggleDarkMode" style="text-decoration:none;margin:0 0.5rem;" :title="darkMode?'Switch to light mode':'Switch to dark mode'">{{ darkMode ? '☀️' : '🌙' }}</a> |
        <a href="#" @click.prevent="logout" style="color: var(--primary);">Log Out</a>
      </div>
    </div>
    
    <div class="tabs">
      <button :class="['tab-link', { active: activeTab === 'live' }]" @click="activeTab = 'live'">Live Presentation</button>
      <button :class="['tab-link', { active: activeTab === 'content' }]" @click="activeTab = 'content'">Manage Content</button>
      <button :class="['tab-link', { active: activeTab === 'users' }]" @click="activeTab = 'users'">Manage Users</button>
      <button :class="['tab-link', { active: activeTab === 'results' }]" @click="activeTab = 'results'">📊 Results</button>
      <button :class="['tab-link', { active: activeTab === 'analytics' }]" @click="activeTab = 'analytics'; loadAnalytics()">📈 Analytics</button>
      <button :class="['tab-link', { active: activeTab === 'media' }]" @click="activeTab = 'media'">🖼 Media</button>
    </div>

    <!-- Error banner -->
    <div v-if="errorMessage" style="background:#fef2f2;color:#dc2626;border:1px solid #fecaca;border-radius:6px;padding:0.75rem 1rem;margin-bottom:1rem;display:flex;justify-content:space-between;align-items:center;">
      <span>{{ errorMessage }}</span>
      <button @click="errorMessage=''" style="background:none;border:none;color:#dc2626;font-size:1.2rem;cursor:pointer;padding:0 0.5rem;">✕</button>
    </div>

    <!-- Tab: Live -->
    <div v-if="activeTab === 'live'" class="dash-layout">
      <!-- Live Presenter view (Left) -->
      <div style="display: flex; flex-direction: column;">
        <div v-if="loading" style="padding:2rem;text-align:center;">
          <div class="edps-wait-icon" style="width:40px;height:40px;border-width:3px;margin:0 auto 1rem;"></div>
          <span style="color:#64748b;">Loading slides...</span>
        </div>
        <div v-else-if="slides.length === 0" style="padding:2rem;text-align:center;color:#94a3b8;">No slides yet. Go to "Manage Content" to create some.</div>
        
        <div v-else class="slide-container" style="flex: 1; border: 1px solid var(--border-color); border-radius: 8px; padding: 2rem; background: #fff;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div class="slide-title" style="margin: 0;">{{ currentSlide.title }}</div>
            <div style="display:flex;gap:0.3rem;">
              <button class="secondary" @click="exportPDF" style="width: auto; padding: 0.2rem 0.5rem; font-size: 0.8rem;">📄 PDF</button>
              <button class="secondary" @click="exportPPTX" style="width: auto; padding: 0.2rem 0.5rem; font-size: 0.8rem;">📊 PPTX</button>
              <button class="secondary" @click="toggleFullscreen" style="width: auto; padding: 0.2rem 0.5rem; font-size: 0.8rem;">⛶ Fullscreen</button>
            </div>
          </div>
          <div v-if="currentSlide.subtitle" class="slide-subtitle" style="margin-top: 0.5rem;">{{ currentSlide.subtitle }}</div>
          <!-- Text content (from textarea, for poll question, survey description) -->
          <div v-if="currentSlide.content && !(currentSlide.elements && currentSlide.elements.length)" style="white-space:pre-wrap;line-height:1.6;margin-top:0.5rem;">{{ currentSlide.content }}</div>
          <div v-if="currentSlide.question" style="font-weight:bold;font-size:1.1rem;margin-top:0.5rem;">{{ currentSlide.question }}</div>
          <div v-if="currentSlide.description" style="color:#64748b;margin-top:0.5rem;">{{ currentSlide.description }}</div>

          <div v-if="currentSlide.type === 'content' || currentSlide.type === 'title'">
             <!-- Canvas visual elements -->
             <div v-if="currentSlide.elements && currentSlide.elements.length" style="position:relative;width:100%;min-height:250px;margin-top:0.5rem;background:#fafafa;border:1px solid #f0f0f0;border-radius:4px;overflow:hidden;">
               <div v-for="el in currentSlide.elements" :key="el.id" :style="{position:'absolute',left:(el.x*0.55)+'px',top:(el.y*0.45)+'px',width:(el.w*0.55)+'px',height:(el.h*0.45)+'px',overflow:'hidden'}">
                 <span v-if="el.kind==='text'" :style="{fontSize:(el.fontSize*0.55)+'px',fontFamily:el.fontFamily||'Segoe UI',fontWeight:el.bold?'bold':'normal',fontStyle:el.italic?'italic':'normal',color:el.color||'#333',textAlign:el.textAlign||'left',display:'block'}" v-html="renderMd(el.content)"></span>
                 <img v-if="el.kind==='image'" :src="resolveUrl(el.src)" style="width:100%;height:100%;object-fit:contain;" />
                 <video v-if="el.kind==='video' && isLocalVideoCheck(el.src)" :src="resolveUrl(el.src)" controls style="width:100%;height:100%;object-fit:contain;"></video>
                 <iframe v-else-if="el.kind==='video'" :src="toEmbedUrlCheck(el.src)" style="width:100%;height:100%;border:none;" frameborder="0" allowfullscreen></iframe>
               </div>
             </div>
             <!-- Legacy image/video (only if no canvas elements) -->
             <div v-if="currentSlide.image && !(currentSlide.elements && currentSlide.elements.length)" style="margin-top:0.5rem;text-align:center;">
               <img :src="resolveUrl(currentSlide.image)" style="max-width:100%;max-height:250px;border-radius:4px;" />
             </div>
             <div v-if="currentSlide.video && !(currentSlide.elements && currentSlide.elements.length)" style="margin-top:0.5rem;text-align:center;">
               <video v-if="isLocalVideoCheck(currentSlide.video)" :src="resolveUrl(currentSlide.video)" controls style="width:100%;max-height:300px;border-radius:8px;"></video>
               <iframe v-else :src="toEmbedUrlCheck(currentSlide.video)" style="width:100%;height:300px;border-radius:8px;" frameborder="0" allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture" allowfullscreen></iframe>
             </div>
          </div>

          <!-- Live Poll Results (Bar Chart) -->
          <div v-if="currentSlide.type === 'poll'" style="width: 100%; margin-top: 2rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <h3 v-if="pollResults.length > 0" style="margin: 0;">Final Results ({{ totalPollAnswers }} total)</h3>
                <h3 v-else style="margin: 0; color: #64748b;">Attendees Voting: {{ pollProgress.answered }} / {{ pollProgress.total }}</h3>
            </div>
            <div v-if="pollResults.length > 0">
               <div v-for="opt in currentSlide.options" :key="opt" class="results-bar">
                 <div style="display: flex; justify-content: space-between; font-size: 0.9rem;">
                   <span :style="{ color: currentSlide.correctOption === opt ? '#10b981' : '', fontWeight: currentSlide.correctOption === opt ? 'bold' : 'normal' }">
                     {{ opt }} <span v-if="currentSlide.correctOption === opt">(Correct)</span>
                   </span>
                   <span>{{ pollAggregated[opt] || 0 }} answers</span>
                 </div>
                 <div class="bar-bg">
                   <div class="bar-fill" :style="{ width: getPercentage(pollAggregated[opt]) + '%', background: currentSlide.correctOption === opt ? '#10b981' : 'var(--secondary)' }"></div>
                 </div>
               </div>
            </div>
            <div v-else style="font-size: 0.9rem; color: #64748b; font-style: italic;">
               Results are hidden until all attendees have submitted their answers.
            </div>
          </div>

          <!-- Live Survey Results (Table) -->
          <div v-if="currentSlide.type === 'survey'" style="width: 100%; margin-top: 2rem; overflow-x: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <h3 v-if="parsedSurveyResults.length > 0" style="margin: 0;">Responses ({{ parsedSurveyResults.length }} total)</h3>
                <h3 v-else style="margin: 0; color: #64748b;">Attendees Responding: {{ pollProgress.answered }} / {{ pollProgress.total }}</h3>
                <div>
                  <button v-if="parsedSurveyResults.length > 0" @click="exportCSV" class="secondary" style="width: auto; padding: 0.3rem 0.6rem; font-size: 0.8rem; margin-right: 0.5rem; margin-bottom: 0;">Export CSV</button>
                  <button v-if="parsedSurveyResults.length > 0" @click="exportJSON" class="secondary" style="width: auto; padding: 0.3rem 0.6rem; font-size: 0.8rem; margin: 0; margin-right: 0.5rem;">Export JSON</button>
                  <button @click="forcePublishSurvey" style="width: auto; padding: 0.3rem 0.6rem; font-size: 0.8rem; background: #f59e0b; border: none; color: white; border-radius: 4px; cursor: pointer;">📢 Publish Results Now</button>
                </div>
            </div>
            <table v-if="parsedSurveyResults.length > 0" style="width: 100%; border-collapse: collapse; font-size: 0.9rem; text-align: left;">
              <thead>
                <tr style="border-bottom: 2px solid var(--border-color);">
                  <th style="padding: 0.5rem; color: var(--primary);">User</th>
                  <th v-for="(q, i) in currentSlide.questions" :key="i" style="padding: 0.5rem; color: var(--primary);">Q{{ i + 1 }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in parsedSurveyResults" :key="r.username" style="border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 0.5rem;"><strong>{{ r.username }}</strong></td>
                  <td v-for="(q, i) in currentSlide.questions" :key="i" style="padding: 0.5rem; white-space: pre-wrap;">{{ r.answers[i] }}</td>
                </tr>
              </tbody>
            </table>
            <div v-else style="color: #64748b; font-style: italic; margin-top: 1rem;">Waiting for everyone to submit...</div>
          </div>

          <!-- Live Timer Controls -->
          <div v-if="currentSlide.type === 'timer'" style="width: 100%; margin-top: 1rem; text-align: center; display:flex; flex-direction:column; align-items:center;">
            <div class="timer-ring-container" style="position:relative; width:220px; height:220px;">
              <svg viewBox="0 0 200 200" style="width:100%; height:100%; transform:rotate(-90deg);">
                <circle cx="100" cy="100" r="88" fill="none" stroke="#e2e8f0" stroke-width="10" />
                <circle cx="100" cy="100" r="88" fill="none" :stroke="timerSeconds <= 10 && timerRunning ? '#ef4444' : timerSeconds <= 30 && timerRunning ? '#f59e0b' : 'var(--primary)'" stroke-width="10" stroke-linecap="round" :stroke-dasharray="553" :stroke-dashoffset="553 - (553 * timerProgress)" style="transition: stroke-dashoffset 1s linear, stroke 0.5s ease;" />
              </svg>
              <div style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); text-align:center;">
                <div :style="{fontSize: '2.8rem', fontWeight:'bold', fontVariantNumeric:'tabular-nums', color: timerSeconds <= 10 && timerRunning ? '#ef4444' : 'var(--primary)', letterSpacing:'2px', lineHeight:'1', transition:'color 0.5s'}">{{ timerDisplay }}</div>
                <div style="font-size:0.75rem; color:#94a3b8; margin-top:4px; text-transform:uppercase; letter-spacing:1px;">{{ timerRunning ? '⏱ Running' : (timerSeconds > 0 && timerSeconds < (currentSlide.duration||300) ? '⏸ Paused' : '⏱ Ready') }}</div>
              </div>
            </div>
            <div style="display: flex; gap: 0.5rem; justify-content: center; margin-top: 1rem;">
              <button @click="startTimer" style="width: auto; padding: 0.5rem 1.2rem; font-size:0.85rem; border-radius:20px;">▶ Start</button>
              <button @click="pauseTimer" class="secondary" style="width: auto; padding: 0.5rem 1.2rem; font-size:0.85rem; border-radius:20px;">⏸ Pause</button>
              <button @click="resumeTimer" class="secondary" style="width: auto; padding: 0.5rem 1.2rem; font-size:0.85rem; border-radius:20px;">▶ Resume</button>
              <button @click="resetTimer" class="danger" style="width: auto; padding: 0.5rem 1.2rem; font-size:0.85rem; border-radius:20px;">↺ Reset</button>
            </div>
          </div>
        </div>

        <div class="controls" v-if="slides.length > 0" style="display: flex; align-items: center; justify-content: center; margin-top: 1.5rem;">
          <button class="secondary" @click="prevSlide" :disabled="currentIndex === 0">Previous Slide</button>
          <button :class="isSlideVisible ? 'danger' : 'primary'" @click="toggleVisibility" style="margin: 0 1rem; font-weight: bold; padding: 0.75rem 2rem;">
             {{ isSlideVisible ? '🔴 Stop Presentation (Show Wait Screen)' : '🟢 Start Presentation (Live for Attendees)' }}
          </button>
          <button class="secondary" @click="nextSlide" :disabled="currentIndex === slides.length - 1">Next Slide</button>
        </div>
        <!-- Speaker Notes (visible only to trainer) -->
        <div v-if="currentSlide.notes" style="margin-top:1rem;padding:0.75rem 1rem;background:#fffef5;border:1px solid #e2e0c8;border-radius:6px;font-size:0.85rem;color:#64748b;">
          <strong style="color:#334155;">📝 Notes:</strong> {{ currentSlide.notes }}
        </div>
        <!-- Freeze & hand raise controls -->
        <div style="display:flex;justify-content:center;gap:0.5rem;margin-top:0.5rem;">
          <button @click="toggleFreeze" :class="frozen ? 'danger' : 'secondary'" style="width:auto;padding:0.4rem 1rem;font-size:0.8rem;border-radius:20px;">
            {{ frozen ? '❄️ Unfreeze Screens' : '🧊 Freeze Attendees' }}
          </button>
          <button v-if="handRaisedCount > 0" @click="clearHands" class="secondary" style="width:auto;padding:0.4rem 1rem;font-size:0.8rem;border-radius:20px;position:relative;">
            ✋ {{ handRaisedCount }} hand{{ handRaisedCount > 1 ? 's' : '' }} raised
            <span style="position:absolute;top:-4px;right:-4px;width:18px;height:18px;background:#ef4444;border-radius:50%;font-size:0.65rem;color:white;display:flex;align-items:center;justify-content:center;">{{ handRaisedCount }}</span>
          </button>
        </div>
        <!-- Slide counter + live info -->
        <div style="display:flex;justify-content:center;gap:2rem;margin-top:0.5rem;font-size:0.8rem;color:#94a3b8;">
          <span>Slide {{ currentIndex + 1 }} / {{ slides.length }}</span>
          <span v-if="connectedUsers > 0">👥 {{ connectedUsers }} connected</span>
        </div>
      </div>
      
      <!-- Instructions (Right) -->
      <div>
        <h3>Instructions</h3>
        <ul style="padding-left: 1.2rem; color: #64748b; font-size: 0.9rem; margin-top: 1rem;">
          <li style="margin-bottom: 0.5rem">Click <strong>Start Presentation</strong> to lock the presentation active for the entire session.</li>
          <li style="margin-bottom: 0.5rem">Click the Fullscreen icon to expand the view to your entire projector.</li>
          <li style="margin-bottom: 0.5rem">Poll results are hidden until all attendees complete them.</li>
        </ul>
        <div style="display:flex;flex-wrap:wrap;gap:0.4rem;margin-top:0.75rem;">
          <button class="secondary" @click="openWheel" style="width:auto;padding:0.4rem 0.8rem;font-size:0.85rem;">🎡 Wheel</button>
          <button class="secondary" @click="openLeaderboard" style="width:auto;padding:0.4rem 0.8rem;font-size:0.85rem;">🏆 Leaderboard</button>
          <button class="secondary" @click="openPresenterMode" style="width:auto;padding:0.4rem 0.8rem;font-size:0.85rem;">🖥 Presenter</button>
          <button class="secondary" @click="showQR=!showQR" style="width:auto;padding:0.4rem 0.8rem;font-size:0.85rem;">📱 QR</button>
        </div>
        <div v-if="sessionCode" style="margin-top:0.5rem;padding:0.5rem;background:#e0f2fe;border-radius:6px;text-align:center;">
          <span style="font-size:0.8rem;color:#64748b;">Session PIN:</span>
          <span style="font-size:1.5rem;font-weight:bold;color:var(--edps-blue,#1b4293);letter-spacing:4px;margin-left:0.5rem;">{{ sessionCode }}</span>
        </div>
        <div v-if="showQR" style="margin-top:0.75rem;text-align:center;">
          <img :src="qrCodeUrl" style="width:180px;height:180px;border:1px solid #e2e8f0;border-radius:8px;" alt="QR Code" />
          <div style="font-size:0.75rem;color:#94a3b8;margin-top:0.3rem;">Scan to join the session</div>
        </div>

        <!-- Live Reactions -->
        <div v-if="reactions.length" style="margin-top:1rem;">
          <h4 style="margin:0 0 0.5rem;font-size:0.9rem;color:#64748b;">Live Reactions</h4>
          <div style="display:flex;flex-wrap:wrap;gap:0.3rem;">
            <span v-for="(r, i) in reactions" :key="i" style="font-size:1.5rem;animation:reactionPop 2s ease-out forwards;" :title="r.username">{{ r.emoji }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Tab: Content Management (Rest remains identical) -->
    <!-- Content Editor Start -->
    <div v-if="activeTab === 'content'">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem;">
        <h3 style="margin:0;">Slides Editor</h3>
        <div style="display:flex;flex-wrap:wrap;gap:0.4rem;">
          <button class="secondary" @click="addSlide('title')" style="width: auto; padding: 0.5rem 0.8rem; font-size:0.82rem;">+ Title</button>
          <button class="secondary" @click="addSlide('content')" style="width: auto; padding: 0.5rem 0.8rem; font-size:0.82rem;">+ Content</button>
          <button class="secondary" @click="addSlide('section')" style="width: auto; padding: 0.5rem 0.8rem; font-size:0.82rem;">+ Section</button>
          <button class="secondary" @click="addSlide('poll')" style="width: auto; padding: 0.5rem 0.8rem; font-size:0.82rem;">+ Poll</button>
          <button class="secondary" @click="addSlide('survey')" style="width: auto; padding: 0.5rem 0.8rem; font-size:0.82rem;">+ Survey</button>
          <button class="secondary" @click="addSlide('timer')" style="width: auto; padding: 0.5rem 0.8rem; font-size:0.82rem;">⏱ Timer</button>
          <button class="secondary" @click="addSlide('rating')" style="width: auto; padding: 0.5rem 0.8rem; font-size:0.82rem;">😀 Rating</button>
          <div style="position:relative;" ref="templateMenuRef">
            <button class="secondary" @click="showTemplateMenu=!showTemplateMenu" style="width:auto;padding:0.5rem 0.8rem;font-size:0.82rem;">📐 Template ▾</button>
            <div v-if="showTemplateMenu" style="position:absolute;top:100%;left:0;z-index:200;background:white;border:1px solid #e2e8f0;border-radius:6px;box-shadow:0 4px 12px rgba(0,0,0,0.15);min-width:200px;margin-top:4px;">
              <button v-for="t in slideTemplates" :key="t.name" @click="addFromTemplate(t); showTemplateMenu=false" style="display:block;width:100%;text-align:left;padding:0.5rem 0.75rem;border:none;background:none;cursor:pointer;font-size:0.85rem;color:#334155;" @mouseenter="$event.target.style.background='#f1f5f9'" @mouseleave="$event.target.style.background='none'">{{ t.icon }} {{ t.name }}</button>
            </div>
          </div>
          <span style="width:1px;height:28px;background:#cbd5e1;align-self:center;"></span>
          <button class="secondary" @click="undo" :disabled="undoStack.length===0" style="width:auto;padding:0.5rem 0.6rem;font-size:0.82rem;" title="Undo (Ctrl+Z)">↩️</button>
          <button class="secondary" @click="redo" :disabled="redoStack.length===0" style="width:auto;padding:0.5rem 0.6rem;font-size:0.82rem;" title="Redo (Ctrl+Y)">↪️</button>
          <button class="secondary" @click="importSlides" style="width: auto; padding: 0.5rem 0.8rem; font-size:0.82rem;" title="Import slides from JSON file">📥 JSON</button>
          <button class="secondary" @click="importPptx" style="width: auto; padding: 0.5rem 0.8rem; font-size:0.82rem;" title="Import slides from PowerPoint file">📊 PPTX</button>
          <button class="secondary" @click="exportSlides" style="width: auto; padding: 0.5rem 0.8rem; font-size:0.82rem;" title="Export slides to JSON file">📤 Export</button>
          <button class="secondary" @click="toggleAllCollapsed" style="width:auto;padding:0.5rem 0.8rem;font-size:0.82rem;">{{ allCollapsed ? '▼ Expand All' : '▲ Collapse All' }}</button>
          <button @click="saveSlides" style="width: auto; padding: 0.5rem 1rem;">Save Changes</button>
          <label style="font-size:0.8rem;color:#64748b;cursor:pointer;display:flex;align-items:center;gap:0.3rem;margin-left:0.5rem;">
            <input type="checkbox" v-model="autoSaveEnabled" style="width:14px;height:14px;margin:0;" /> Auto-save
          </label>
          <span :class="['autosave-indicator', autoSaveStatus]">{{ autoSaveLabel }}</span>
        </div>
      </div>
      <input type="file" ref="importFileInput" accept=".json" style="display:none;" @change="onImportFile" />
      <input type="file" ref="importPptxInput" accept=".pptx" style="display:none;" @change="onImportPptx" />
      <div v-if="saveMessage" style="color: #10b981; font-weight: bold; margin-bottom: 1rem;">{{ saveMessage }}</div>

      <div v-for="(slide, index) in editSlides" :key="slide.id" draggable="true" @dragstart="onDragStart(index, $event)" @dragover.prevent="onDragOver(index, $event)" @drop="onDrop(index)" @dragend="dragIdx=null" :style="{border: '1px solid var(--border-color)', padding: '1.5rem', borderRadius: '8px', marginBottom: '0.75rem', background: '#fff', opacity: dragIdx===index ? 0.4 : 1, borderTop: dragOverIdx===index ? '3px solid var(--primary)' : '1px solid var(--border-color)'}">
        <div style="display: flex; justify-content: space-between; align-items: center; cursor:pointer;" @click="slide._collapsed = !slide._collapsed">
          <div style="display:flex;align-items:center;gap:0.75rem;">
            <div :style="{width:'40px',height:'26px',background:slideTypeColor(slide.type),borderRadius:'4px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.65rem',color:'white',fontWeight:'bold',flexShrink:0}">{{ slideTypeIcon(slide.type) }}</div>
            <span style="font-size:0.8rem;color:#94a3b8;">{{ slide._collapsed ? '▶' : '▼' }}</span>
            <strong style="font-size: 1rem; color: var(--primary);">{{ index + 1 }}. {{ slide.title || '(untitled)' }}</strong>
            <span v-if="slide._collapsed && slide.subtitle" style="font-size:0.8rem;color:#94a3b8;">— {{ slide.subtitle }}</span>
          </div>
          <div @click.stop style="display:flex;gap:0.3rem;">
             <button class="secondary" style="width:auto;padding:0.15rem 0.4rem;font-size:0.75rem;" @click="moveSlide(index, -1)" :disabled="index === 0">↑</button>
             <button class="secondary" style="width:auto;padding:0.15rem 0.4rem;font-size:0.75rem;" @click="moveSlide(index, 1)" :disabled="index === editSlides.length - 1">↓</button>
             <button class="secondary" style="width:auto;padding:0.15rem 0.4rem;font-size:0.75rem;" @click="duplicateSlide(index)">📋</button>
             <button class="danger" style="width:auto;padding:0.15rem 0.4rem;font-size:0.75rem;" @click="removeSlide(index)">🗑</button>
          </div>
        </div>

        <template v-if="!slide._collapsed">
        <input v-model="slide.title" placeholder="Slide Title" style="margin-top:0.75rem;" />
        
        <!-- Content/Title Slide Edit -->
        <template v-if="slide.type === 'content' || slide.type === 'title'">
          <input v-model="slide.subtitle" placeholder="Subtitle (Optional)" />

          <!-- Text Content (synced with first text element in visual editor) -->
          <div style="margin-bottom:0.75rem;">
            <label style="font-size:0.8rem;font-weight:bold;color:#64748b;display:block;margin-bottom:0.3rem;">Text Content <span style="font-weight:normal;color:#94a3b8;">(supports **Markdown**)</span></label>
            <textarea :value="getSlideText(slide)" @input="setSlideText(slide, $event.target.value)" placeholder="Slide content text (supports Markdown: **bold**, *italic*, - lists, ## headings)..." rows="3" style="margin-bottom:0;font-size:0.9rem;font-family:'Cascadia Code','Fira Code',monospace;"></textarea>
          </div>

          <!-- Visual Editor -->
          <div style="margin-top:0.5rem;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.3rem;">
              <label style="font-size:0.8rem;font-weight:bold;color:#64748b;">🎨 Visual Editor</label>
              <button class="secondary" @click="openVisualEditor(slide)" style="width:auto;padding:0.15rem 0.5rem;font-size:0.75rem;margin-bottom:0;">
                {{ slide._showCanvas ? '▲ Collapse' : '▼ Expand' }}
              </button>
            </div>
            <div v-if="slide.elements && slide.elements.length && !slide._showCanvas" style="padding:0.5rem;background:#f8fafc;border:1px solid #e2e8f0;border-radius:4px;font-size:0.8rem;color:#64748b;">
              {{ slide.elements.length }} visual element(s) — click Expand to edit
            </div>
            <div v-if="slide._showCanvas" style="margin-top:0.3rem;">
              <SlideCanvas v-model="slide.elements" :slideTitle="slide.title" @update:modelValue="syncTextFromElements(slide)" />
            </div>
          </div>
        </template>
        
        <!-- Poll Slide Edit -->
        <template v-if="slide.type === 'poll'">
          <input v-model="slide.question" placeholder="Poll Question" />
          <div style="margin-top: 0.5rem;">
            <strong>Poll Options (Select the correct answer button):</strong>
            <div v-for="(opt, oIndex) in slide.options" :key="oIndex" style="display: flex; gap: 0.5rem; margin-top: 0.5rem; align-items: center;">
              <input type="radio" :value="slide.options[oIndex]" v-model="slide.correctOption" name="correctOpt" title="Mark as Correct Answer" style="width: auto; margin: 0; transform: scale(1.2);" />
              <input v-model="slide.options[oIndex]" placeholder="Option text" style="margin-bottom: 0; flex: 1;" />
              <button class="danger" style="width: auto; margin-bottom: 0;" @click="slide.options.splice(oIndex, 1)">X</button>
            </div>
            <button class="secondary" style="width: auto; margin-top: 0.5rem; font-size: 0.8rem;" @click="slide.options.push('')">+ Add Option</button>
          </div>
        </template>
        
        <!-- Survey Slide Edit -->
        <template v-if="slide.type === 'survey'">
          <textarea v-model="slide.description" placeholder="Survey Instructions (Optional)" rows="2" style="margin-bottom: 1rem;"></textarea>
          <div style="margin-top: 0.5rem;">
            <strong>Survey Questions:</strong>
            <div v-for="(q, qIndex) in slide.questions" :key="qIndex" style="border-left: 3px solid var(--primary); padding-left: 1rem; margin-top: 1rem; padding-bottom: 1rem; border-bottom: 1px solid #f1f5f9;">
              <div style="display: flex; gap: 0.5rem; margin-bottom: 0.5rem;">
                <input v-model="q.text" placeholder="E.g., How would you rate the training?" style="margin-bottom: 0; flex: 1;" />
                <select v-model="q.type" style="margin-bottom: 0; width: 150px;">
                  <option value="text">Text Entry</option>
                  <option value="rating">1-5 Rating</option>
                  <option value="choice">Multiple Choice</option>
                </select>
                <button class="danger" style="width: auto; margin-bottom: 0;" @click="slide.questions.splice(qIndex, 1)">Remove</button>
              </div>
              
               <div v-if="q.type === 'choice'" style="margin-top: 0.5rem; padding-left: 2rem;">
                  <div style="font-size: 0.8rem; font-weight: bold; color: #64748b; margin-bottom: 0.25rem;">Choices:</div>
                  <div v-for="(opt, oIndex) in q.options" :key="oIndex" style="display: flex; gap: 0.5rem; margin-bottom: 0.25rem;">
                    <input v-model="q.options[oIndex]" placeholder="Choice text" style="margin-bottom: 0; padding: 0.3rem;" />
                    <button class="danger" style="width: auto; padding: 0.3rem 0.5rem; font-size: 0.8rem; margin-bottom: 0;" @click="q.options.splice(oIndex, 1)">x</button>
                  </div>
                  <button class="secondary" style="width: auto; padding: 0.2rem 0.5rem; font-size: 0.8rem;" @click="q.options.push('')">+ Choice</button>
               </div>
            </div>
            <button class="secondary" style="width: auto; margin-top: 0.5rem; font-size: 0.8rem;" @click="slide.questions.push({text: '', type: 'text', options: []})">+ Add Question</button>
          </div>
        </template>

        <!-- Timer Slide Edit -->
        <template v-if="slide.type === 'timer'">
          <div style="display: flex; align-items: center; gap: 1rem; margin-top: 0.5rem;">
            <label style="font-size: 0.85rem; font-weight: bold; color: #64748b;">Duration (seconds):</label>
            <input type="number" v-model.number="slide.duration" min="10" max="3600" style="width: 120px; margin-bottom: 0;" />
            <span style="font-size: 0.85rem; color: #94a3b8;">{{ Math.floor((slide.duration || 0) / 60) }}m {{ (slide.duration || 0) % 60 }}s</span>
          </div>
        </template>

        <!-- Rating Slide Edit -->
        <template v-if="slide.type === 'rating'">
          <input v-model="slide.question" placeholder="What should attendees rate?" />
          <div style="margin-top:0.5rem;font-size:0.85rem;color:#64748b;">
            Attendees will see: 😡 😕 😐 🙂 😍 (1-5 scale)
          </div>
        </template>

        <!-- Section Slide Edit -->
        <template v-if="slide.type === 'section'">
          <input v-model="slide.subtitle" placeholder="Subtitle (Optional)" />
        </template>

        <!-- Rating toggle (all slide types) -->
        <div style="margin-top:0.75rem;display:flex;align-items:center;gap:0.75rem;">
          <label style="font-size:0.85rem;color:#64748b;cursor:pointer;display:flex;align-items:center;gap:0.4rem;">
            <input type="checkbox" v-model="slide.ratingEnabled" style="width:16px;height:16px;margin:0;" />
            😀 Enable rating on this slide
          </label>
          <span v-if="slide.ratingEnabled" style="font-size:0.75rem;color:#94a3b8;">Attendees will see: 😡😕😐🙂😍</span>
        </div>

        <!-- Speaker Notes (all slide types) -->
        <details style="margin-top: 0.75rem;">
          <summary style="cursor:pointer;font-size:0.85rem;color:#64748b;font-weight:bold;">📝 Speaker Notes</summary>
          <textarea v-model="slide.notes" placeholder="Private notes for the presenter (not visible to attendees)..." rows="2" style="margin-top:0.5rem;font-size:0.85rem;background:#fffef5;border-color:#e2e0c8;"></textarea>
        </details>

        </template>
      </div>
    </div>

    <!-- Tab: User Management -->
    <!-- Content omitted to preserve space but remains logically identically managed -->
    <div v-if="activeTab === 'users'">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
        <h3 style="margin: 0;">User Management</h3>
        <button @click="fetchUsers" class="secondary" style="width: auto; padding: 0.5rem;">Refresh</button>
      </div>

      <div style="background: #fff; border: 1px solid var(--border-color); border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem;">
        <h4 style="margin-top: 0; color: var(--primary);">Provision New User</h4>
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr 1fr auto; gap: 0.75rem; align-items: end;">
          <div>
            <label style="font-size: 0.75rem; font-weight: bold; color: #64748b;">Username</label>
            <input v-model="newUser.username" placeholder="jdoe" style="margin-bottom:0;font-size:0.85rem;" />
          </div>
          <div>
            <label style="font-size: 0.75rem; font-weight: bold; color: #64748b;">Password</label>
            <input v-model="newUser.password" type="password" placeholder="***" style="margin-bottom:0;font-size:0.85rem;" />
          </div>
          <div>
            <label style="font-size: 0.75rem; font-weight: bold; color: #64748b;">Display Name</label>
            <input v-model="newUser.display_name" placeholder="(auto-generated)" style="margin-bottom:0;font-size:0.85rem;" />
          </div>
          <div>
            <label style="font-size: 0.75rem; font-weight: bold; color: #64748b;">Team</label>
            <input v-model="newUser.team" placeholder="DPO" style="margin-bottom:0;font-size:0.85rem;" />
          </div>
          <div>
            <label style="font-size: 0.75rem; font-weight: bold; color: #64748b;">Role</label>
            <select v-model="newUser.role" style="margin-bottom:0;font-size:0.85rem;">
              <option value="Attendee">Attendee</option>
              <option value="Trainer">Trainer</option>
            </select>
          </div>
          <button @click="createUser" style="margin-bottom:0;">Create</button>
        </div>
        <div v-if="userMessage" style="margin-top: 0.5rem; font-size: 0.9rem; color: #10b981;">{{ userMessage }}</div>
      </div>

      <!-- Users Table -->
      <table style="width: 100%; text-align: left; border-collapse: collapse; margin-top: 1rem; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border-radius: 8px; overflow: hidden; font-size:0.85rem;">
        <thead style="background: var(--primary); color: white;">
          <tr>
            <th style="padding:0.5rem 0.75rem;">Avatar</th>
            <th style="padding:0.5rem 0.75rem;">Username</th>
            <th style="padding:0.5rem 0.75rem;">Display Name</th>
            <th style="padding:0.5rem 0.75rem;">PIN</th>
            <th style="padding:0.5rem 0.75rem;">Team</th>
            <th style="padding:0.5rem 0.75rem;">Role</th>
            <th style="padding:0.5rem 0.75rem;">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in usersList" :key="u.id" style="border-bottom: 1px solid var(--border-color);">
            <td style="padding:0.4rem 0.75rem;">
              <template v-if="editingUser && editingUser.id === u.id">
                <input v-model="editingUser.avatar" placeholder="/uploads/..." style="margin-bottom:0;padding:0.2rem;font-size:0.8rem;width:80px;" />
              </template>
              <template v-else>
                <img v-if="u.avatar" :src="resolveUrl(u.avatar)" style="width:32px;height:32px;border-radius:50%;object-fit:cover;" />
                <span v-else style="font-size:1.2rem;">👤</span>
              </template>
            </td>
            <td style="padding:0.4rem 0.75rem;">
              <template v-if="editingUser && editingUser.id === u.id">
                <input v-model="editingUser.username" style="margin-bottom:0;padding:0.2rem;font-size:0.8rem;width:90px;" />
              </template>
              <template v-else><strong>{{ u.username }}</strong></template>
            </td>
            <td style="padding:0.4rem 0.75rem;">
              <template v-if="editingUser && editingUser.id === u.id">
                <input v-model="editingUser.display_name" style="margin-bottom:0;padding:0.2rem;font-size:0.8rem;width:110px;" />
              </template>
              <template v-else>{{ u.display_name || '—' }}</template>
            </td>
            <td style="padding:0.4rem 0.75rem;">
              <span style="font-family:monospace;font-weight:bold;font-size:1rem;letter-spacing:2px;color:var(--edps-blue,#1b4293);">{{ u.pin || '—' }}</span>
            </td>
            <td style="padding:0.4rem 0.75rem;">
              <template v-if="editingUser && editingUser.id === u.id">
                <input v-model="editingUser.team" style="margin-bottom:0;padding:0.2rem;font-size:0.8rem;width:70px;" />
              </template>
              <template v-else>{{ u.team }}</template>
            </td>
            <td style="padding:0.4rem 0.75rem;">
              <template v-if="editingUser && editingUser.id === u.id">
                <select v-model="editingUser.role" style="margin-bottom:0;padding:0.2rem;font-size:0.8rem;">
                  <option value="Attendee">Attendee</option>
                  <option value="Trainer">Trainer</option>
                </select>
              </template>
              <template v-else>
                <span :style="{color: u.role==='Trainer'?'var(--primary)':'#64748b',fontWeight:u.role==='Trainer'?'bold':'normal'}">{{ u.role }}</span>
              </template>
            </td>
            <td style="padding:0.4rem 0.75rem;">
              <div style="display:flex;gap:0.3rem;">
                <template v-if="editingUser && editingUser.id === u.id">
                  <button @click="saveUser" style="width:auto;padding:0.15rem 0.4rem;font-size:0.75rem;background:#10b981;">Save</button>
                  <button @click="editingUser=null" class="secondary" style="width:auto;padding:0.15rem 0.4rem;font-size:0.75rem;">Cancel</button>
                </template>
                <template v-else>
                  <button @click="startEditUser(u)" class="secondary" style="width:auto;padding:0.15rem 0.4rem;font-size:0.75rem;">✏️</button>
                  <button class="danger" style="width:auto;padding:0.15rem 0.4rem;font-size:0.75rem;" @click="deleteUser(u.id)" :disabled="u.username === user?.username">🗑</button>
                </template>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Tab: Survey Results -->
    <div v-if="activeTab === 'results'">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
        <h3 style="margin:0;">Survey & Poll Results</h3>
        <button class="danger" @click="resetAllAnswers" style="width:auto;padding:0.5rem 1rem;font-size:0.85rem;">🗑 Reset All Answers</button>
      </div>
      <SurveyResults :slides="slides" />
    </div>

    <!-- Tab: Analytics -->
    <div v-if="activeTab === 'analytics'">
      <h3>📈 Session Analytics</h3>
      <div v-if="!analytics" style="text-align:center;padding:2rem;color:#64748b;">Loading analytics...</div>
      <div v-else>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:1rem;margin-bottom:2rem;">
          <div style="padding:1.5rem;background:#e0f2fe;border-radius:12px;text-align:center;">
            <div style="font-size:2rem;font-weight:bold;color:var(--edps-blue,#1b4293);">{{ analytics.totalAttendees }}</div>
            <div style="font-size:0.85rem;color:#64748b;">Attendees</div>
          </div>
          <div style="padding:1.5rem;background:#f0fdf4;border-radius:12px;text-align:center;">
            <div style="font-size:2rem;font-weight:bold;color:#059669;">{{ analytics.totalResponses }}</div>
            <div style="font-size:0.85rem;color:#64748b;">Total Responses</div>
          </div>
          <div style="padding:1.5rem;background:#fef3c7;border-radius:12px;text-align:center;">
            <div style="font-size:2rem;font-weight:bold;color:#d97706;">{{ analytics.slidesWithAnswers }}</div>
            <div style="font-size:0.85rem;color:#64748b;">Slides with Answers</div>
          </div>
        </div>
        <div style="display:flex;gap:1rem;flex-wrap:wrap;">
          <div style="flex:1;min-width:300px;">
            <h4>Responses per Slide</h4>
            <div v-for="s in analytics.responsesPerSlide" :key="s.slide_id" style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.5rem;">
              <span style="width:80px;font-size:0.85rem;color:#64748b;">Slide {{ s.slide_id }}</span>
              <div style="flex:1;background:#e2e8f0;height:20px;border-radius:10px;overflow:hidden;">
                <div :style="{width:Math.min(100,s.responses/analytics.totalAttendees*100)+'%',height:'100%',background:'var(--edps-blue,#1b4293)',borderRadius:'10px',transition:'width 0.5s'}"></div>
              </div>
              <span style="font-size:0.85rem;font-weight:bold;">{{ s.responses }}</span>
            </div>
          </div>
          <div v-if="analytics.quizLeaderboard.length" style="flex:1;min-width:250px;">
            <h4>🏆 Quiz Leaderboard</h4>
            <div v-for="(q, i) in analytics.quizLeaderboard" :key="q.username" style="display:flex;align-items:center;gap:0.5rem;padding:0.4rem;border-bottom:1px solid #f1f5f9;">
              <span style="font-weight:bold;width:20px;">{{ i+1 }}.</span>
              <span style="flex:1;">{{ q.username }}</span>
              <span style="font-weight:bold;color:var(--edps-blue);">{{ q.total_points }} pts</span>
            </div>
          </div>
        </div>
        <div style="margin-top:1.5rem;text-align:center;">
          <button @click="exportAnalyticsPDF" class="secondary" style="width:auto;padding:0.5rem 1.5rem;">📄 Export Report as PDF</button>
        </div>
      </div>
    </div>

    <!-- Tab: Media Library -->
    <div v-if="activeTab === 'media'">
      <MediaManager />
    </div>

    <!-- Modals -->
    <SpinningWheel :visible="showWheel" :attendees="wheelAttendees" @close="showWheel=false" @result="onWheelResult" />
    <Leaderboard :visible="showLeaderboard" :entries="leaderboardEntries" @close="showLeaderboard=false" />
  </div>

  <!-- FULLSCREEN TRAINER VIEW (MIRRORS ATTENDEE EXACTLY) -->
  <div v-if="isFullscreen" id="trainer-fullscreen" class="presentation-wrapper fullscreen" ref="wrapper" style="width: 100vw; height: 100vh; background: #e5e7eb;">
      
      <!-- Clock -->
      <div v-show="isSlideVisible" style="position: absolute; top: 1.5rem; right: 2rem; font-size: 1.4rem; font-weight: bold; color: var(--edps-blue); z-index: 999; text-shadow: 0 0 10px rgba(255,255,255,0.8);">
        {{ currentTime }}
      </div>

      <!-- Wait Screen Info for Trainer (Since global visibility is toggled off) -->
      <div v-if="!currentSlide || !isSlideVisible" class="edps-presentation" ref="slide">
        <div class="edps-wait-screen">
           <div class="edps-wait-icon"></div>
           <h2>Presentation mode is currently 🔴 OFF</h2>
           <p>Attendees are seeing this completely branded EDPS Wait Screen.</p>
           <p style="margin-top: 2rem; opacity: 0.7; font-size: 0.8rem;">(Press ESC to return to dashboard to activate it)</p>
        </div>
      </div>
      
      <!-- Mirror Presentation Mode -->
      <div v-else class="edps-presentation" ref="slide">
        
        <!-- TITLE SLIDE TEMPLATE -->
        <div v-if="currentSlide.type === 'title'" class="edps-title-slide">
          <div class="edps-title-top">
             <img src="/template/edps_logo.png" style="height: 55px;" alt="EDPS Logo" />
          </div>
          <div class="edps-title-middle">
             <div class="edps-title-gold">
                <h2 style="margin: 0; font-size: 1.8rem; line-height: 1.2;">{{ currentSlide.title }}</h2>
                <div style="margin-top: 1rem; font-size: 1.1rem; opacity: 0.9;">{{ currentSlide.subtitle }}</div>
                <div style="margin-top: 2rem; font-size: 0.9rem;">{{ currentSlide.content }}</div>
             </div>
             <div class="edps-title-blue">
                <h1>PEDRRA</h1>
                <div style="position: absolute; top: 1rem; right: 1rem; width: 60px; height: 60px; background: white; border-radius: 50%;"></div>
             </div>
          </div>
          <div v-if="currentSlide.image" style="position:absolute; bottom: 100px; right: 5%; width: 300px; z-index: 5;">
               <img :src="currentSlide.image" style="max-width: 100%; border-radius: 4px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);" />
          </div>
          <div v-if="currentSlide.video" style="position:absolute; bottom: 100px; right: 5%; width: 400px; height: 225px; z-index: 5;">
               <video v-if="isLocalVideoCheck(currentSlide.video)" :src="resolveUrl(currentSlide.video)" controls style="width: 100%; height: 100%; border-radius: 8px;"></video>
               <iframe v-else :src="toEmbedUrlCheck(currentSlide.video)" style="width: 100%; height: 100%; border-radius: 8px;" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
          </div>
          <div class="edps-title-bottom">
             <div style="width: 35%;"></div>
             <div class="edps-title-bottom-blue">
               Systems Oversight and Technology Audits Sector,<br/>and Privacy Unit
             </div>
          </div>
        </div>

        <!-- #10 — SECTION SLIDE TEMPLATE (fullscreen) -->
        <div v-else-if="currentSlide.type === 'section'" style="position:relative;width:100%;height:100%;background-image:url('/template/section_bg.png');background-size:cover;background-position:center;overflow:hidden;">
          <!-- Main title box center-left (overlaid on the template background) -->
          <div style="position:absolute;top:35%;left:8%;width:42%;padding:1.5rem 2rem;background:var(--edps-blue,#3B5998);">
            <div style="color:white;font-weight:bold;font-size:1.6rem;line-height:1.3;">{{ currentSlide.title }}</div>
            <div v-if="currentSlide.subtitle" style="color:rgba(255,255,255,0.8);font-size:0.95rem;margin-top:0.5rem;">{{ currentSlide.subtitle }}</div>
          </div>
          <!-- Slide number -->
          <div style="position:absolute;bottom:1rem;right:1rem;color:var(--edps-blue,#3B5998);font-size:0.8rem;font-weight:bold;">{{ currentSlide.id }}</div>
        </div>

        <!-- CONTENT / POLL / SURVEY TEMPLATES -->
        <template v-else>
          <div class="edps-header">
             <img src="/template/edps_logo.png" class="edps-header-logo" alt="EDPS Logo" />
             <h2 class="edps-header-title">{{ currentSlide.title }}</h2>
          </div>

          <div class="edps-content-area" style="overflow-y: auto;">
            <div v-if="currentSlide.subtitle" style="color: var(--edps-blue); font-size: 1.4rem; font-weight: bold; margin-bottom: 2rem;">{{ currentSlide.subtitle }}</div>

            <!-- #11 — Content slide: render visual canvas elements if present -->
            <template v-if="currentSlide.type === 'content'">
              <template v-if="currentSlide.elements && currentSlide.elements.length">
                <div style="position:relative;width:100%;min-height:300px;">
                  <div v-for="el in currentSlide.elements" :key="el.id" :style="{position:'absolute',left:el.x+'px',top:el.y+'px',width:el.w+'px',height:el.h+'px',overflow:'hidden'}">
                    <span v-if="el.kind==='text'" :style="{fontSize:el.fontSize+'px',fontFamily:el.fontFamily||'Segoe UI',fontWeight:el.bold?'bold':'normal',fontStyle:el.italic?'italic':'normal',color:el.color||'#333',textAlign:el.textAlign||'left',display:'block'}" v-html="renderMd(el.content)"></span>
                    <img v-if="el.kind==='image'" :src="resolveUrl(el.src)" style="width:100%;height:100%;object-fit:contain;" />
                    <video v-if="el.kind==='video' && isLocalVideoCheck(el.src)" :src="resolveUrl(el.src)" controls style="width:100%;height:100%;object-fit:contain;"></video>
                    <iframe v-else-if="el.kind==='video'" :src="toEmbedUrlCheck(el.src)" style="width:100%;height:100%;border:none;" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
                  </div>
                </div>
              </template>
              <template v-else>
                <div style="white-space: pre-wrap;">{{ currentSlide.content }}</div>
              </template>
            </template>
            <div v-if="currentSlide.image && !(currentSlide.elements && currentSlide.elements.length)" style="margin-top: 1.5rem; text-align: center;">
               <img :src="resolveUrl(currentSlide.image)" style="max-width: 100%; max-height: 350px; border-radius: 8px;" />
            </div>
            <div v-if="currentSlide.video && !(currentSlide.elements && currentSlide.elements.length)" style="margin-top: 1.5rem; text-align: center;">
               <video v-if="isLocalVideoCheck(currentSlide.video)" :src="resolveUrl(currentSlide.video)" controls style="width: 100%; max-height: 350px; border-radius: 8px; max-width: 800px;"></video>
               <iframe v-else :src="toEmbedUrlCheck(currentSlide.video)" style="width: 100%; height: 350px; border-radius: 8px; max-width: 800px;" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
            </div>
            
            <!-- Live Poll Tracker -->
            <template v-if="currentSlide.type === 'poll'">
               <div style="font-weight: bold; margin-bottom: 1.5rem; font-size: 1.3rem;">{{ currentSlide.question }}</div>
               
               <!-- Visible Final Results -->
               <div v-if="pollResults.length > 0">
                  <div v-for="opt in currentSlide.options" :key="opt" style="margin-bottom: 1.2rem;">
                    <div style="display: flex; justify-content: space-between; font-weight: bold;">
                      <span :style="{ color: currentSlide.correctOption === opt ? '#10b981' : '' }">
                         {{ opt }} <span v-if="currentSlide.correctOption === opt" style="background: #10b981; color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.8rem;">(Correct)</span>
                      </span>
                      <span>{{ pollAggregated[opt] || 0 }} votes</span>
                    </div>
                    <div style="background: #e2e8f0; height: 24px; border-radius: 12px; overflow: hidden; margin-top: 0.5rem;">
                      <div style="height: 100%; transition: width 0.5s ease;" :style="{ width: getPercentage(pollAggregated[opt]) + '%', background: currentSlide.correctOption === opt ? '#10b981' : 'var(--edps-gold)' }"></div>
                    </div>
                  </div>
               </div>
               
               <!-- Hidden Progressive View -->
               <div v-else style="padding: 2rem; background: #e0f2fe; color: var(--edps-blue); font-weight: bold; border-left: 4px solid var(--edps-blue); border-radius: 0 8px 8px 0; display: flex; align-items: center; gap: 1rem;">
                  <div class="edps-wait-icon" style="width: 40px; height: 40px; border-width: 3px; margin: 0;"></div>
                  <div>
                    Voting in progress... Results are strictly hidden on your system until everyone finishes.<br>
                    <span style="font-size: 1.4rem;">{{ pollProgress.answered }} / {{ pollProgress.total }} Voted</span>
                  </div>
               </div>
            </template>

            <!-- Survey Tracker -->
            <template v-if="currentSlide.type === 'survey'">
              <div style="margin-bottom: 2rem; font-size: 1.1rem;">{{ currentSlide.description }}</div>
              
              <div v-if="parsedSurveyResults.length > 0" style="padding: 2rem; background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; border-radius: 8px; font-weight: bold;">
                  Survey Complete. You have received all responses.
              </div>
              <div v-else style="padding: 2rem; background: #e0f2fe; color: var(--edps-blue); font-weight: bold; border-left: 4px solid var(--edps-blue); display: flex; align-items: center; gap: 1rem;">
                  <div class="edps-wait-icon" style="width: 40px; height: 40px; border-width: 3px; margin: 0;"></div>
                  <div>
                    Survey in progress... Responses are hidden pending completion.<br>
                    <span style="font-size: 1.4rem;">{{ pollProgress.answered }} / {{ pollProgress.total }} Completed</span>
                  </div>
              </div>
            </template>

            <!-- Timer (fullscreen) -->
            <template v-if="currentSlide.type === 'timer'">
              <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;flex:1;min-height:300px;">
                <div style="position:relative; width:340px; height:340px;">
                  <svg viewBox="0 0 200 200" style="width:100%; height:100%; transform:rotate(-90deg);">
                    <circle cx="100" cy="100" r="88" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="8" />
                    <circle cx="100" cy="100" r="88" fill="none" :stroke="timerSeconds <= 10 && timerRunning ? '#ef4444' : timerSeconds <= 30 && timerRunning ? '#f59e0b' : 'var(--edps-gold)'" stroke-width="8" stroke-linecap="round" :stroke-dasharray="553" :stroke-dashoffset="553 - (553 * timerProgress)" style="transition: stroke-dashoffset 1s linear, stroke 0.5s ease; filter: drop-shadow(0 0 8px currentColor);" />
                  </svg>
                  <div style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); text-align:center;">
                    <div :style="{fontSize:'5rem', fontWeight:'bold', fontVariantNumeric:'tabular-nums', color: timerSeconds <= 10 && timerRunning ? '#ef4444' : 'var(--edps-blue)', letterSpacing:'4px', lineHeight:'1', transition:'color 0.5s'}">{{ timerDisplay }}</div>
                    <div style="font-size:1rem; color:#94a3b8; margin-top:8px; text-transform:uppercase; letter-spacing:2px;">{{ timerRunning ? '⏱ Running' : (timerSeconds > 0 && timerSeconds < (currentSlide.duration||300) ? '⏸ Paused' : '⏱ Ready') }}</div>
                  </div>
                </div>
              </div>
            </template>
          </div>

          <div class="edps-bottom-bar"></div>
          <div class="edps-corner-graphics">
             <div class="edps-corner-gold-arc"></div>
             <div class="edps-corner-circle">{{ currentSlide.id }}</div>
          </div>
        </template>
      </div>

    <!-- Fullscreen top bar: hand raises + presenter tools -->
    <div style="position:absolute;top:0;left:0;right:0;z-index:200;display:flex;justify-content:space-between;align-items:center;padding:0.4rem 1rem;background:rgba(0,0,0,0.5);">
      <div style="display:flex;align-items:center;gap:0.5rem;">
        <span v-if="handRaisedCount > 0" style="background:#ef4444;color:white;padding:0.3rem 0.8rem;border-radius:16px;font-size:0.85rem;font-weight:bold;animation:handPulse 1.5s ease infinite;">
          ✋ {{ handRaisedCount }} hand{{ handRaisedCount > 1 ? 's' : '' }}
        </span>
        <span style="color:rgba(255,255,255,0.5);font-size:0.8rem;">Slide {{ currentIndex + 1 }}/{{ slides.length }}</span>
      </div>
      <div style="display:flex;align-items:center;gap:0.4rem;">
        <button @click.stop="openWheel" style="background:rgba(255,255,255,0.15);border:none;color:white;padding:0.3rem 0.7rem;border-radius:16px;font-size:0.8rem;cursor:pointer;">🎡 Wheel</button>
        <button @click.stop="showQROverlay" style="background:rgba(255,255,255,0.15);border:none;color:white;padding:0.3rem 0.7rem;border-radius:16px;font-size:0.8rem;cursor:pointer;">📱 QR</button>
        <button @click.stop="openLeaderboard" style="background:rgba(255,255,255,0.15);border:none;color:white;padding:0.3rem 0.7rem;border-radius:16px;font-size:0.8rem;cursor:pointer;">🏆 Leaderboard</button>
        <button v-if="handRaisedCount > 0" @click.stop="clearHands" style="background:rgba(255,255,255,0.15);border:none;color:white;padding:0.3rem 0.7rem;border-radius:16px;font-size:0.8rem;cursor:pointer;">✋ Clear hands</button>
        <button @click.stop="toggleFreeze" :style="{background:frozen?'#ef4444':'rgba(255,255,255,0.15)',border:'none',color:'white',padding:'0.3rem 0.7rem',borderRadius:'16px',fontSize:'0.8rem',cursor:'pointer'}">{{ frozen ? '❄️ Unfreeze' : '🧊 Freeze' }}</button>
        <span style="color:rgba(255,255,255,0.6);font-size:1rem;font-weight:bold;margin-left:0.5rem;font-variant-numeric:tabular-nums;">{{ currentTime }}</span>
      </div>
    </div>

    <!-- Speaker notes overlay for fullscreen (only trainer sees this) -->
    <div v-if="currentSlide.notes" style="position:absolute;bottom:3rem;left:1rem;right:50%;background:rgba(0,0,0,0.7);color:#e2e8f0;padding:0.75rem 1rem;border-radius:6px;font-size:0.85rem;z-index:100;max-height:120px;overflow-y:auto;line-height:1.4;">
      📝 {{ currentSlide.notes }}
    </div>
    <!-- ═══ FULLSCREEN OVERLAYS (only trainer sees, projected to students) ═══ -->

    <!-- Spinning Wheel overlay (fullscreen) -->
    <div v-if="showWheel && isFullscreen" style="position:absolute;inset:0;z-index:500;background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);display:flex;flex-direction:column;align-items:center;justify-content:center;animation:overlayFadeIn 0.3s ease-out;">
      <!-- Title -->
      <div style="color:white;font-size:2rem;font-weight:bold;margin-bottom:2rem;text-shadow:0 2px 8px rgba(0,0,0,0.5);">🎲 Who's next?</div>

      <!-- Slot machine display -->
      <div style="position:relative;width:350px;height:200px;overflow:hidden;border-radius:20px;border:4px solid var(--edps-gold);box-shadow:0 0 60px rgba(241,192,100,0.3),inset 0 0 30px rgba(0,0,0,0.3);background:#1e293b;">
        <!-- Selection indicator -->
        <div style="position:absolute;top:50%;left:0;right:0;transform:translateY(-50%);height:70px;border-top:3px solid var(--edps-gold);border-bottom:3px solid var(--edps-gold);background:rgba(241,192,100,0.1);z-index:5;pointer-events:none;"></div>
        <!-- Scrolling names -->
        <div style="position:absolute;left:0;right:0;display:flex;flex-direction:column;align-items:center;transition:transform 0.1s ease-out;" :style="{transform:'translateY('+slotOffset+'px)'}">
          <div v-for="(att, i) in slotItems" :key="'slot-'+i" style="height:70px;display:flex;align-items:center;justify-content:center;gap:1rem;width:100%;padding:0 1.5rem;">
            <img v-if="att.avatar" :src="resolveUrl(att.avatar)" style="width:50px;height:50px;border-radius:50%;object-fit:cover;border:2px solid rgba(255,255,255,0.3);flex-shrink:0;" />
            <div v-else style="width:50px;height:50px;border-radius:50%;background:var(--edps-blue);display:flex;align-items:center;justify-content:center;color:white;font-size:1.2rem;font-weight:bold;flex-shrink:0;">{{ (att.display_name || att.username || '?')[0] }}</div>
            <span style="color:white;font-size:1.4rem;font-weight:bold;text-shadow:0 1px 4px rgba(0,0,0,0.5);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">{{ att.display_name || att.username }}</span>
          </div>
        </div>
      </div>

      <!-- Winner reveal -->
      <div v-if="fullscreenWheelWinner" style="margin-top:2rem;animation:podiumRise 0.5s ease-out;">
        <div style="display:flex;align-items:center;gap:1.5rem;padding:1.5rem 3rem;background:linear-gradient(135deg,var(--edps-gold),#f59e0b);border-radius:24px;box-shadow:0 10px 40px rgba(241,192,100,0.4);">
          <span style="font-size:3.5rem;">🎉</span>
          <img v-if="fullscreenWheelWinner.avatar" :src="resolveUrl(fullscreenWheelWinner.avatar)" style="width:80px;height:80px;border-radius:50%;object-fit:cover;border:4px solid white;box-shadow:0 4px 12px rgba(0,0,0,0.3);" />
          <div style="text-align:left;">
            <div style="font-size:2.5rem;font-weight:900;color:white;text-shadow:0 2px 4px rgba(0,0,0,0.3);">{{ fullscreenWheelWinner.display_name || fullscreenWheelWinner.username }}</div>
          </div>
          <span style="font-size:3.5rem;">🎉</span>
        </div>
      </div>

      <!-- Controls -->
      <div style="margin-top:2rem;display:flex;gap:1rem;">
        <button @click.stop="spinSlotMachine" :disabled="wheelSpinState || wheelAttendees.length < 2" style="padding:1rem 3rem;font-size:1.2rem;border-radius:30px;background:var(--edps-gold);color:white;border:none;font-weight:bold;cursor:pointer;box-shadow:0 4px 20px rgba(241,192,100,0.4);">🎲 Pick Someone!</button>
        <button @click.stop="showWheel=false" style="padding:1rem 2rem;font-size:1.1rem;border-radius:30px;background:rgba(255,255,255,0.15);color:white;border:1px solid rgba(255,255,255,0.3);cursor:pointer;">✕ Close</button>
      </div>
    </div>

    <!-- Leaderboard overlay (fullscreen) -->
    <div v-if="showLeaderboard && isFullscreen" class="pres-overlay" @click.self="showLeaderboard=false">
      <div style="background:white;border-radius:24px;padding:2.5rem;width:85%;max-width:600px;max-height:80vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.5);">
        <h2 style="margin:0 0 1.5rem;text-align:center;color:var(--edps-blue);font-size:2.2rem;">🏆 Leaderboard</h2>
        <div v-if="leaderboardEntries.length >= 1" class="podium-container">
          <div v-if="leaderboardEntries[1]" class="podium-place silver"><div class="podium-rank">🥈</div><img v-if="leaderboardEntries[1].avatar" :src="resolveUrl(leaderboardEntries[1].avatar)" class="podium-avatar" /><div class="podium-name">{{ leaderboardEntries[1].display_name || leaderboardEntries[1].username }}</div><div class="podium-points">{{ leaderboardEntries[1].total_points || 0 }} pts</div></div>
          <div class="podium-place gold"><div class="podium-rank">🥇</div><img v-if="leaderboardEntries[0].avatar" :src="resolveUrl(leaderboardEntries[0].avatar)" class="podium-avatar" /><div class="podium-name">{{ leaderboardEntries[0].display_name || leaderboardEntries[0].username }}</div><div class="podium-points">{{ leaderboardEntries[0].total_points || 0 }} pts</div></div>
          <div v-if="leaderboardEntries[2]" class="podium-place bronze"><div class="podium-rank">🥉</div><img v-if="leaderboardEntries[2].avatar" :src="resolveUrl(leaderboardEntries[2].avatar)" class="podium-avatar" /><div class="podium-name">{{ leaderboardEntries[2].display_name || leaderboardEntries[2].username }}</div><div class="podium-points">{{ leaderboardEntries[2].total_points || 0 }} pts</div></div>
        </div>
        <div v-for="(e, i) in leaderboardEntries.slice(3)" :key="e.username" style="display:flex;align-items:center;gap:1rem;padding:0.6rem 1rem;margin-bottom:0.4rem;background:#f8fafc;border-radius:8px;">
          <span style="width:28px;text-align:center;font-weight:bold;color:#94a3b8;font-size:1.1rem;">{{ i+4 }}</span>
          <span style="flex:1;font-weight:600;font-size:1.05rem;">{{ e.display_name || e.username }}</span>
          <span style="font-weight:bold;color:var(--edps-blue);font-size:1.1rem;">{{ e.total_points || 0 }}</span>
        </div>
        <div style="text-align:center;margin-top:1.5rem;">
          <button @click.stop="showLeaderboard=false" class="secondary" style="width:auto;padding:0.7rem 2rem;border-radius:20px;">Close</button>
        </div>
      </div>
    </div>

    <!-- QR Code sidebar overlay (fullscreen) -->
    <div v-if="showQR && isFullscreen" class="qr-overlay" @click.self="showQR=false">
      <div style="font-size:1.5rem;font-weight:bold;color:var(--edps-blue);margin-bottom:1.5rem;">📱 Join the Session</div>
      <img v-if="qrCodeUrl" :src="qrCodeUrl" style="width:300px;height:300px;border:3px solid #e2e8f0;border-radius:16px;" />
      <div v-if="sessionCode" style="margin-top:1.5rem;font-size:3rem;font-weight:900;color:var(--edps-blue);letter-spacing:10px;">{{ sessionCode }}</div>
      <div style="margin-top:0.8rem;color:#94a3b8;font-size:1rem;">Scan QR code or enter PIN above</div>
      <button @click.stop="showQR=false" class="secondary" style="margin-top:1.5rem;width:auto;padding:0.6rem 1.5rem;border-radius:20px;">Close</button>
    </div>

    <!-- Hand raise flying notifications (fullscreen) -->
    <div v-for="hn in fullscreenHandNotifs" :key="hn.id" class="hand-notification">
      <div class="hand-emoji">✋</div>
      <div class="hand-name">{{ hn.name }}</div>
    </div>

    <!-- Instructor Help overlay for fullscreen -->
    <div style="position: absolute; bottom: 1rem; left: 1rem; color: #94a3b8; font-size: 0.8rem; z-index: 100; text-shadow: 1px 1px 2px rgba(0,0,0,0.5);">
      LEFT/RIGHT to navigate · ESC to exit
    </div>

  </div>

</template>

<script>
import { io } from 'socket.io-client';
import { baseUrl } from '../config.js';
import { authFetch, authHeaders, getToken, clearAuth } from '../auth.js';
import PptxGenJS from 'pptxgenjs';
import { marked } from 'marked';
import { toEmbedUrl, isLocalVideo } from '../utils/media.js';
import SurveyResults from './SurveyResults.vue';
import MediaManager from './MediaManager.vue';
import SlideCanvas from './SlideCanvas.vue';
import SpinningWheel from './SpinningWheel.vue';
import Leaderboard from './Leaderboard.vue';

export default {
  components: { SurveyResults, MediaManager, SlideCanvas, SpinningWheel, Leaderboard },
  data() {
    return {
      activeTab: 'live',
      slides: [],
      editSlides: [],
      currentIndex: 0,
      isFullscreen: false,
      isSlideVisible: false,
      user: null,
      socket: null,
      pollResults: [], 
      pollProgress: { answered: 0, total: 0 },
      saveMessage: '',
      usersList: [],
      newUser: { username: '', password: '', team: '', role: 'Attendee', display_name: '', avatar: '' },
      editingUser: null,
      userMessage: '',
      dragIdx: null,
      dragOverIdx: null,
      darkMode: localStorage.getItem('darkMode') === 'true',
      previewSlide: null,
      connectedUsers: 0,
      loading: true,
      undoStack: [],
      redoStack: [],
      reactions: [],
      frozen: false,
      handRaisedCount: 0,
      autoSaveEnabled: false,
      autoSaveInterval: null,
      autoSaveStatus: '',
      autoSaveLabel: '',
      hasUnsavedChanges: false,
      showQR: false,
      fullscreenWheelRotation: 0,
      wheelSpinState: false,
      fullscreenWheelWinner: null,
      slotOffset: 0,
      slotItems: [],
      slotAnimFrame: null,
      fullscreenHandNotifs: [],
      showTemplateMenu: false,
      showWheel: false,
      showLeaderboard: false,
      wheelAttendees: [],
      leaderboardEntries: [],
      sessionCode: '',
      analytics: null,
      presenterWindow: null,
      _prevPollSlideId: null,
      slideTemplates: [
        { name: 'Title + Image', icon: '🖼', type: 'content', elements: [
          { id: 'tpl_t', kind: 'text', x: 50, y: 90, w: 450, h: 60, content: 'Your Title Here', fontSize: 32, fontFamily: 'Segoe UI', bold: true, italic: false, color: '#1b4293', textAlign: 'left' },
          { id: 'tpl_i', kind: 'image', x: 520, y: 90, w: 460, h: 400, src: '' }
        ]},
        { name: 'Two Columns', icon: '📰', type: 'content', elements: [
          { id: 'tpl_l', kind: 'text', x: 40, y: 90, w: 470, h: 380, content: 'Left column content...', fontSize: 18, fontFamily: 'Segoe UI', bold: false, italic: false, color: '#333', textAlign: 'left' },
          { id: 'tpl_r', kind: 'text', x: 530, y: 90, w: 470, h: 380, content: 'Right column content...', fontSize: 18, fontFamily: 'Segoe UI', bold: false, italic: false, color: '#333', textAlign: 'left' }
        ]},
        { name: 'Full Image', icon: '🌄', type: 'content', elements: [
          { id: 'tpl_fi', kind: 'image', x: 0, y: 0, w: 1024, h: 576, src: '' }
        ]},
        { name: 'Quote', icon: '💬', type: 'content', elements: [
          { id: 'tpl_q', kind: 'text', x: 100, y: 150, w: 824, h: 200, content: '"Your inspiring quote goes here."', fontSize: 28, fontFamily: 'Georgia', bold: false, italic: true, color: '#1b4293', textAlign: 'center' },
          { id: 'tpl_a', kind: 'text', x: 300, y: 370, w: 424, h: 40, content: '— Author Name', fontSize: 18, fontFamily: 'Segoe UI', bold: false, italic: false, color: '#64748b', textAlign: 'center' }
        ]},
      ],
      currentTime: '',
      clockInterval: null,
      connected: false,
      errorMessage: '',
      timerSeconds: 0,
      timerRunning: false,
      timerInterval: null
    }
  },
  watch: {
    autoSaveEnabled() { this._setupAutoSave(); },
    editSlides: { handler() { this.hasUnsavedChanges = true; }, deep: true },
  },
  computed: {
    currentSlide() {
      return this.slides[this.currentIndex] || {};
    },
    pollAggregated() {
      const counts = {};
      if (!Array.isArray(this.pollResults)) return counts;
      for(let r of this.pollResults) {
        counts[r.answer] = (counts[r.answer] || 0) + 1;
      }
      return counts;
    },
    totalPollAnswers() {
      return Array.isArray(this.pollResults) ? this.pollResults.length : 0;
    },
    allCollapsed() {
      return this.editSlides.every(s => s._collapsed);
    },
    qrCodeUrl() {
      const url = encodeURIComponent(window.location.origin);
      return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${url}`;
    },
    timerDisplay() {
      const s = Math.max(0, this.timerSeconds);
      const m = Math.floor(s / 60);
      const sec = s % 60;
      return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    },
    timerProgress() {
      const dur = this.currentSlide?.duration || 300;
      if (dur <= 0) return 1;
      return Math.max(0, Math.min(1, this.timerSeconds / dur));
    },
    parsedSurveyResults() {
      if (!Array.isArray(this.pollResults)) return [];
      return this.pollResults.map(r => {
         let ans = {};
         try { ans = JSON.parse(r.answer); } catch(e) {}
         return { username: r.username, answers: ans };
      });
    }
  },
  async mounted() {
    this.user = JSON.parse(localStorage.getItem('user'));
    if (!this.user || this.user.role !== 'Trainer') {
      this.$router.push('/');
      return;
    }
    
    await this.fetchSlides();
    this.fetchUsers();
    this.loadSessionCode();

    // Apply dark mode if saved
    if (this.darkMode) document.documentElement.setAttribute('data-theme', 'dark');

    // Keyboard shortcuts
    this._keyHandler = (e) => {
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) { e.preventDefault(); this.undo(); }
      if (e.ctrlKey && e.key === 'z' && e.shiftKey) { e.preventDefault(); this.redo(); }
      if (e.ctrlKey && e.key === 'y') { e.preventDefault(); this.redo(); }
      if (e.ctrlKey && e.key === 's') { e.preventDefault(); this.saveSlides(); }
    };
    window.addEventListener('keydown', this._keyHandler);

    // Create socket connection FIRST
    this.socket = io(baseUrl, { auth: { token: getToken() } });

    this.socket.on('connect', () => { this.connected = true; });
    this.socket.on('disconnect', () => { this.connected = false; });
    this.socket.on('connect_error', (err) => {
      if (err.message === 'Authentication failed' || err.message === 'Authentication required') {
        clearAuth();
        this.$router.push('/');
      }
    });
    this.socket.on('users:count', (count) => { this.connectedUsers = count; });

    this.socket.on('slide:current', (id) => {
      const idx = this.slides.findIndex(s => s.id === id);
      if (idx !== -1) {
        this.currentIndex = idx;
        this.checkPollResults();
      }
    });

    this.socket.on('slide:visibility', (visible) => {
      this.isSlideVisible = visible;
    });

    this.socket.on('reaction:new', (r) => {
      this.reactions.push(r);
      if (this.reactions.length > 20) this.reactions.shift();
      setTimeout(() => { this.reactions.shift(); }, 5000);
    });

    // Freeze mode
    this.socket.on('slide:freeze', (frozen) => { this.frozen = frozen; });
    // Hand raise
    this.socket.on('hand:count', (count) => { this.handRaisedCount = count; });
    this.socket.on('hand:raised', (data) => {
      this.handRaisedCount++;
      // Show fly-up notification in fullscreen
      if (this.isFullscreen) {
        const notif = { id: Date.now() + Math.random(), name: data.display_name || data.username };
        this.fullscreenHandNotifs.push(notif);
        setTimeout(() => { this.fullscreenHandNotifs = this.fullscreenHandNotifs.filter(n => n.id !== notif.id); }, 3500);
      }
    });
    this.socket.on('hand:cleared', () => { this.handRaisedCount = 0; });

    this.checkPollResults();

    // Fullscreen Listeners
    document.addEventListener('fullscreenchange', this.onFullscreenChange);
    window.addEventListener('resize', this.resizeSlide);
    window.addEventListener('keydown', this.handleKeydown);

    // #17 — Clock with immediate first tick
    const clockTick = () => {
        this.currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };
    clockTick();
    this.clockInterval = setInterval(clockTick, 1000);
  },
  unmounted() {
    if (this.socket) this.socket.disconnect();
    document.removeEventListener('fullscreenchange', this.onFullscreenChange);
    window.removeEventListener('resize', this.resizeSlide);
    window.removeEventListener('keydown', this.handleKeydown);
    if (this._keyHandler) window.removeEventListener('keydown', this._keyHandler);
    clearInterval(this.clockInterval);
    clearInterval(this.autoSaveInterval);
    clearInterval(this.timerInterval);
  },
  watch: {
    currentIndex() {
      if (!this.socket) return;
      const slide = this.currentSlide;
      if (slide) {
        this.socket.emit('slide:change', slide.id);
        this.checkPollResults();
      }
    }
  },
  methods: {
    onFullscreenChange() {
      this.isFullscreen = !!document.fullscreenElement;
      if (this.isFullscreen) {
         this.$nextTick(() => { this.resizeSlide(); });
      }
    },
    handleKeydown(e) {
      if (!this.isFullscreen) return;
      if (e.key === 'ArrowRight' || e.key === ' ') this.nextSlide();
      if (e.key === 'ArrowLeft') this.prevSlide();
    },
    resizeSlide() {
      if (!this.isFullscreen) return;
      this.$nextTick(() => {
          const wrapper = this.$refs.wrapper;
          if (!wrapper) return;
          const slides = wrapper.querySelectorAll('.edps-presentation');
          if (slides.length === 0) return;
          
          const slide = slides[0];
          const targetRatio = 1024 / 576;
          const rect = wrapper.getBoundingClientRect();
          
          const wWidth = rect.width * 0.95;
          const wHeight = rect.height * 0.95;
          const currentRatio = wWidth / wHeight;
          let scale;
          if (currentRatio > targetRatio) scale = wHeight / 576;
          else scale = wWidth / 1024;
          
          slide.style.transform = `scale(${scale})`;
      });
    },
    toggleFullscreen() {
      if (!this.isFullscreen) {
        // Try native fullscreen first, fall back to manual
        const elem = document.documentElement;
        if (elem.requestFullscreen) {
          elem.requestFullscreen().catch(() => {
            // Fullscreen API failed (e.g., iframe restrictions), use manual mode
            this.isFullscreen = true;
            this.$nextTick(() => this.resizeSlide());
          });
        } else {
          // No Fullscreen API support, use manual mode
          this.isFullscreen = true;
          this.$nextTick(() => this.resizeSlide());
        }
      } else {
        if (document.fullscreenElement) {
          document.exitFullscreen();
        } else {
          this.isFullscreen = false;
        }
      }
    },
    migrateQuestions(slidesData) {
        if (!Array.isArray(slidesData)) return [];
        return slidesData.map(s => {
            if (s.type === 'survey' && Array.isArray(s.questions)) {
                s.questions = s.questions.map(q =>
                   typeof q === 'string' ? { text: q, type: 'text', options: [] } : q
                );
            }
            // Ensure ratingEnabled defaults to false if not set
            if (s.ratingEnabled === undefined) s.ratingEnabled = false;
            return s;
        });
    },
    showError(msg) {
      this.errorMessage = msg;
      setTimeout(() => { if (this.errorMessage === msg) this.errorMessage = ''; }, 8000);
    },
    async fetchSlides() {
      this.loading = true;
      try {
        const res = await fetch(`${baseUrl}/api/slides`);
        if (!res.ok) throw new Error(`Failed to load slides (${res.status})`);
        const data = await res.json();
        this.slides = this.migrateQuestions(data);
        this.editSlides = JSON.parse(JSON.stringify(this.slides)).map(s => ({ ...s, _collapsed: true }));
      } catch (e) { this.showError(e.message); }
      finally { this.loading = false; }
    },
    async fetchUsers() {
      try {
        const res = await authFetch(`${baseUrl}/api/users`);
        if (!res.ok) throw new Error(`Failed to load users (${res.status})`);
        this.usersList = await res.json();
      } catch (e) { this.showError(e.message); }
    },
    async createUser() {
      if (!this.newUser.username || !this.newUser.password) return;
      try {
        const res = await authFetch(`${baseUrl}/api/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.newUser)
        });
        if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed to create user'); }
          this.userMessage = 'User provisioned successfully!';
          this.newUser = { username: '', password: '', team: '', role: 'Attendee', display_name: '', avatar: '' };
          this.fetchUsers();
          setTimeout(() => this.userMessage = '', 3000);
      } catch(e) { this.showError(e.message); }
    },
    async deleteUser(id) {
      if(!confirm('Are you sure you want to delete this user?')) return;
      try {
        const res = await authFetch(`${baseUrl}/api/users/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete user');
        this.fetchUsers();
      } catch(e) { this.showError(e.message); }
    },
    startEditUser(u) {
      this.editingUser = { id: u.id, username: u.username, password: '', team: u.team, role: u.role, display_name: u.display_name || '', avatar: u.avatar || '' };
    },
    async saveUser() {
      if (!this.editingUser) return;
      try {
        const res = await authFetch(`${baseUrl}/api/users/${this.editingUser.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.editingUser)
        });
        if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed to update user'); }
        this.editingUser = null;
        this.userMessage = 'User updated successfully!';
        this.fetchUsers();
        setTimeout(() => this.userMessage = '', 3000);
      } catch(e) { this.showError(e.message); }
    },
    addSlide(type) {
      const id = Date.now();
      const base = { ratingEnabled: false };
      if (type === 'poll') {
        this.editSlides.push({ ...base, id, type, title: 'New Poll', question: 'What is your question?', correctOption: '', options: ['Option 1', 'Option 2'] });
      } else if (type === 'survey') {
        this.editSlides.push({ ...base, id, type, title: 'Survey', description: 'Please answer the following:', questions: [
            { text: 'How do you rate this? (1-5)', type: 'rating', options: [] },
            { text: 'Feedback', type: 'text', options: [] }
        ] });
      } else if (type === 'title') {
        this.editSlides.push({ ...base, id, type: 'title', title: 'New Topic', subtitle: 'A new section', content: 'Details here', image: '', video: '' });
      } else if (type === 'timer') {
        this.editSlides.push({ ...base, id, type: 'timer', title: 'Countdown Timer', duration: 300 });
      } else if (type === 'rating') {
        this.editSlides.push({ ...base, id, type: 'rating', title: 'Rate this session', question: 'How would you rate this topic?', ratingType: 'emoji' });
      } else if (type === 'section') {
        this.editSlides.push({ ...base, id, type: 'section', title: 'Section Title', subtitle: '' });
      } else {
        this.editSlides.push({ ...base, id, type: 'content', title: 'Content Slide', subtitle: '', content: '', image: '', video: '' });
      }
    },
    removeSlide(index) {
      this.saveUndoState();
      this.editSlides.splice(index, 1);
    },
    duplicateSlide(index) {
      const original = this.editSlides[index];
      const clone = JSON.parse(JSON.stringify(original));
      clone.id = Date.now();
      clone.title = clone.title + ' (Copy)';
      if (clone.elements) clone.elements.forEach(el => { el.id = 'el_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5); });
      this.editSlides.splice(index + 1, 0, clone);
    },
    moveSlide(index, direction) {
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= this.editSlides.length) return;
      const slide = this.editSlides.splice(index, 1)[0];
      this.editSlides.splice(targetIndex, 0, slide);
    },
    // Drag & drop reordering
    onDragStart(index, e) {
      this.dragIdx = index;
      e.dataTransfer.effectAllowed = 'move';
    },
    onDragOver(index) {
      if (this.dragIdx === null || this.dragIdx === index) return;
      this.dragOverIdx = index;
    },
    onDrop(index) {
      if (this.dragIdx === null || this.dragIdx === index) { this.dragOverIdx = null; return; }
      const slide = this.editSlides.splice(this.dragIdx, 1)[0];
      this.editSlides.splice(index, 0, slide);
      this.dragIdx = null;
      this.dragOverIdx = null;
    },
    // Import/Export slides
    exportSlides() {
      const data = JSON.stringify(this.editSlides, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'pedrra-slides.json';
      link.click();
    },
    importSlides() {
      this.$refs.importFileInput.value = '';
      this.$refs.importFileInput.click();
    },
    onImportFile(e) {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const slides = JSON.parse(ev.target.result);
          if (!Array.isArray(slides)) throw new Error('File must contain an array of slides');
          if (confirm(`Import ${slides.length} slides? This will REPLACE all current slides.`)) {
            this.editSlides = slides;
            this.saveMessage = `Imported ${slides.length} slides. Click "Save Changes" to persist.`;
            setTimeout(() => this.saveMessage = '', 5000);
          }
        } catch (err) { this.showError('Invalid JSON file: ' + err.message); }
      };
      reader.readAsText(file);
    },
    importPptx() {
      this.$refs.importPptxInput.value = '';
      this.$refs.importPptxInput.click();
    },
    async onImportPptx(e) {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!file.name.endsWith('.pptx')) { this.showError('Please select a .pptx file'); return; }
      this.saveMessage = 'Importing PowerPoint... Please wait.';
      try {
        const formData = new FormData();
        formData.append('file', file);
        const token = getToken();
        const res = await fetch(`${baseUrl}/api/import-pptx`, {
          method: 'POST', body: formData,
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Import failed'); }
        const data = await res.json();
        if (data.slides && data.slides.length > 0) {
          const action = confirm(`Imported ${data.slides.length} slides (${data.imageCount} images). Replace current slides? (OK = Replace, Cancel = Append)`);
          if (action) {
            this.editSlides = data.slides;
          } else {
            this.editSlides.push(...data.slides);
          }
          this.saveMessage = `✅ Imported ${data.slides.length} slides from "${file.name}". Click "Save Changes" to persist.`;
          setTimeout(() => this.saveMessage = '', 8000);
        } else {
          this.showError('No slides found in the PowerPoint file.');
        }
      } catch (err) {
        this.saveMessage = '';
        this.showError('PPTX import error: ' + err.message);
      }
    },
    // Slide templates
    addFromTemplate(tpl) {
      const id = Date.now();
      const elements = JSON.parse(JSON.stringify(tpl.elements)).map((el, i) => ({ ...el, id: 'el_' + id + '_' + i }));
      this.editSlides.push({ id, type: tpl.type, title: tpl.name, subtitle: '', content: '', image: '', video: '', elements, _showCanvas: true });
    },
    // Undo/Redo
    saveUndoState() {
      this.undoStack.push(JSON.stringify(this.editSlides));
      if (this.undoStack.length > 30) this.undoStack.shift();
      this.redoStack = [];
    },
    undo() {
      if (this.undoStack.length === 0) return;
      this.redoStack.push(JSON.stringify(this.editSlides));
      this.editSlides = JSON.parse(this.undoStack.pop());
    },
    redo() {
      if (this.redoStack.length === 0) return;
      this.undoStack.push(JSON.stringify(this.editSlides));
      this.editSlides = JSON.parse(this.redoStack.pop());
    },
    // Slide type visual helpers
    slideTypeColor(type) {
      const colors = { title: '#1b4293', content: '#059669', section: '#d97706', poll: '#7c3aed', survey: '#e11d48', timer: '#0891b2', rating: '#f59e0b' };
      return colors[type] || '#64748b';
    },
    slideTypeIcon(type) {
      const icons = { title: '📌', content: '📝', section: '📂', poll: '📊', survey: '📋', timer: '⏱', rating: '😀' };
      return icons[type] || '📄';
    },
    // Bidirectional sync: textarea ↔ first text element in visual editor
    getSlideText(slide) {
      // If elements exist, read from the first text element
      if (slide.elements && slide.elements.length) {
        const textEl = slide.elements.find(el => el.kind === 'text');
        if (textEl) return textEl.content || '';
      }
      // Otherwise read from legacy slide.content
      return slide.content || '';
    },
    setSlideText(slide, value) {
      // Always update legacy field
      slide.content = value;
      // Also update first text element if it exists, or create one
      if (!slide.elements) slide.elements = [];
      const textEl = slide.elements.find(el => el.kind === 'text');
      if (textEl) {
        textEl.content = value;
      } else if (value.trim()) {
        // Auto-create a text element synced with content
        slide.elements.unshift({
          id: Date.now(), kind: 'text', content: value,
          x: 40, y: 60, w: 600, h: 300,
          fontSize: 18, fontFamily: 'Segoe UI', color: '#333333',
          bold: false, italic: false, textAlign: 'left'
        });
      }
    },
    toggleAllCollapsed() {
      const target = !this.allCollapsed;
      this.editSlides.forEach(s => { s._collapsed = target; });
    },
    syncTextFromElements(slide) {
      // When visual editor changes, sync first text element back to slide.content
      if (slide.elements && slide.elements.length) {
        const textEl = slide.elements.find(el => el.kind === 'text');
        if (textEl) slide.content = textEl.content || '';
      }
    },
    ensureTextElement(slide) {
      // Ensure a text element exists in the visual editor, create one if needed
      if (!slide.elements) slide.elements = [];
      let textEl = slide.elements.find(el => el.kind === 'text');
      if (!textEl && slide.content) {
        const id = 'el_' + Date.now();
        textEl = {
          id, kind: 'text', x: 50, y: 90, w: 900, h: 350,
          content: slide.content,
          fontSize: 20, fontFamily: 'Segoe UI', bold: false, italic: false, color: '#333333', textAlign: 'left'
        };
        slide.elements.push(textEl);
      }
      slide._showCanvas = true;
    },
    openVisualEditor(slide) {
      slide._showCanvas = !slide._showCanvas;
    },
    async saveSlides() {
      this.saveMessage = 'Saving...';
      try {
        const res = await authFetch(`${baseUrl}/api/slides`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.editSlides.map(s => {
            const { _collapsed, _showCanvas, _showPreview, ...clean } = s;
            return clean;
          }))
        });
        if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Server error'); }
        const data = await res.json();
        this.slides = this.migrateQuestions(data.slides || []);
        this.editSlides = JSON.parse(JSON.stringify(this.slides)).map(s => ({ ...s, _collapsed: true }));
        this.saveMessage = 'Successfully saved!';
        this.hasUnsavedChanges = false;
        setTimeout(() => this.saveMessage = '', 3000);
      } catch (e) { this.saveMessage = ''; this.showError('Error saving changes: ' + e.message); }
    },
    prevSlide() { if (this.currentIndex > 0) this.currentIndex--; },
    nextSlide() { if (this.currentIndex < this.slides.length - 1) this.currentIndex++; },
    toggleVisibility() {
      this.socket.emit('slide:toggleVisibility', !this.isSlideVisible);
    },
    forcePublishSurvey() {
      if (this.currentSlide?.id) {
        this.socket.emit('poll:forcePublish', this.currentSlide.id);
      }
    },
    checkPollResults() {
      // Clean up any previous listeners
      if (this._prevPollSlideId) {
        this.socket.off(`poll:results:trainer:${this._prevPollSlideId}`);
        this.socket.off(`poll:progress:trainer:${this._prevPollSlideId}`);
        this.socket.off(`timer:update:${this._prevPollSlideId}`);
      }
      clearInterval(this.timerInterval);
      this._prevPollSlideId = this.currentSlide.id;

      if (this.currentSlide.type === 'poll' || this.currentSlide.type === 'survey') {
        this.pollResults = [];
        this.pollProgress = { answered: 0, total: 0 };

        this.socket.on(`poll:results:trainer:${this.currentSlide.id}`, (results) => {
          this.pollResults = results;
        });

        this.socket.on(`poll:progress:trainer:${this.currentSlide.id}`, (progress) => {
          this.pollProgress = progress;
        });

        this.socket.emit('poll:getResults', this.currentSlide.id);
      } else if (this.currentSlide.type === 'timer') {
        this.timerSeconds = this.currentSlide.duration || 300;
        this.timerRunning = false;
        this.socket.on(`timer:update:${this.currentSlide.id}`, (state) => this._handleTimerUpdate(state));
        this.socket.emit('timer:get', this.currentSlide.id);
      }
    },
    getPercentage(count) {
      if (!count || this.totalPollAnswers === 0) return 0;
      return (count / this.totalPollAnswers) * 100;
    },
    // #12 — CSV with proper username escaping
    exportCSV() {
        let headers = ['"User"', ...this.currentSlide.questions.map(q => `"${q.text.replace(/"/g, '""')}"`)];
        let csvContent = headers.join(',') + '\n';
        this.parsedSurveyResults.forEach(r => {
            const row = [`"${r.username.replace(/"/g, '""')}"`, ...this.currentSlide.questions.map((q, i) => `"${(r.answers[i] || '').toString().replace(/"/g, '""')}"`)];
            csvContent += row.join(',') + '\n';
        });
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `Slide_${this.currentSlide.id}_Results.csv`;
        link.click();
    },
    exportJSON() {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.parsedSurveyResults, null, 2));
        const link = document.createElement("a");
        link.href = dataStr;
        link.download = `Slide_${this.currentSlide.id}_Results.json`;
        link.click();
    },
    renderMd(text) {
      if (!text) return '';
      try { return marked.parse(text, { breaks: true }); } catch { return text; }
    },
    resolveUrl(url) {
      if (!url) return '';
      return url.startsWith('http') ? url : `${baseUrl}${url}`;
    },
    toEmbedUrlCheck(url) {
      return toEmbedUrl(url);
    },
    isLocalVideoCheck(url) {
      return isLocalVideo(url);
    },
    exportPDF() {
      // Open a printable view of all slides in a new window
      const printWin = window.open('', '_blank');
      let html = `<html><head><title>PEDRRA Presentation</title>
        <style>
          body{font-family:'Segoe UI',sans-serif;margin:0;padding:0;}
          .slide{page-break-after:always;padding:3rem;min-height:90vh;position:relative;border-bottom:2px solid #e2e8f0;}
          .slide:last-child{page-break-after:avoid;}
          h1{color:#1b4293;margin:0 0 0.5rem;}
          h2{color:#64748b;margin:0 0 1.5rem;font-weight:normal;}
          .content{font-size:1.1rem;line-height:1.8;white-space:pre-wrap;}
          .footer{position:absolute;bottom:1rem;right:1rem;color:#94a3b8;font-size:0.8rem;}
          img{max-width:80%;max-height:300px;display:block;margin:1rem auto;}
          .poll-q{font-weight:bold;font-size:1.2rem;margin:1rem 0;}
          .poll-opt{padding:0.5rem 1rem;margin:0.3rem 0;background:#f1f5f9;border-radius:4px;}
        </style></head><body>`;
      this.slides.forEach((s, i) => {
        html += `<div class="slide">`;
        html += `<h1>${this.escHtml(s.title)}</h1>`;
        if (s.subtitle) html += `<h2>${this.escHtml(s.subtitle)}</h2>`;
        if (s.content) html += `<div class="content">${this.escHtml(s.content)}</div>`;
        if (s.image) html += `<img src="${this.resolveUrl(s.image)}" />`;
        if (s.type === 'poll') {
          html += `<div class="poll-q">${this.escHtml(s.question || '')}</div>`;
          (s.options || []).forEach(o => { html += `<div class="poll-opt">${this.escHtml(o)}</div>`; });
        }
        if (s.type === 'survey' && s.questions) {
          s.questions.forEach((q, qi) => { html += `<div class="poll-q">Q${qi+1}: ${this.escHtml(q.text || '')}</div>`; });
        }
        if (s.elements && s.elements.length) {
          s.elements.forEach(el => {
            if (el.kind === 'text') html += `<div style="font-size:${el.fontSize||16}px;color:${el.color||'#333'};font-weight:${el.bold?'bold':'normal'};white-space:pre-wrap;margin:0.5rem 0;">${this.escHtml(el.content||'')}</div>`;
            if (el.kind === 'image') html += `<img src="${this.resolveUrl(el.src)}" />`;
          });
        }
        html += `<div class="footer">Slide ${i+1} / ${this.slides.length}</div>`;
        html += `</div>`;
      });
      html += `</body></html>`;
      printWin.document.write(html);
      printWin.document.close();
      printWin.onload = () => { printWin.print(); };
    },
    async exportPPTX() {
      try {
        const pptx = new PptxGenJS();
        pptx.defineLayout({ name: 'WIDE', width: 13.33, height: 7.5 });
        pptx.layout = 'WIDE';
        for (const s of this.slides) {
          const slide = pptx.addSlide();
          // Blue bar at top
          slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 0.6, fill: { color: '1b4293' } });
          slide.addText(s.title || '', { x: 0.5, y: 0.08, w: 10, h: 0.45, fontSize: 18, color: 'FFFFFF', bold: true });
          if (s.type === 'title') {
            slide.addShape(pptx.ShapeType.rect, { x: 0, y: 1.5, w: '35%', h: 4.5, fill: { color: 'dea133' } });
            slide.addShape(pptx.ShapeType.rect, { x: '35%', y: 1.5, w: '65%', h: 4.5, fill: { color: '1b4293' } });
            slide.addText(s.title || '', { x: 5, y: 2.5, w: 7, h: 1.5, fontSize: 36, color: 'FFFFFF', bold: true, align: 'center' });
            if (s.subtitle) slide.addText(s.subtitle, { x: 5, y: 4, w: 7, h: 0.8, fontSize: 16, color: 'CCCCCC', align: 'center' });
          } else if (s.type === 'poll') {
            slide.addText(s.question || '', { x: 0.5, y: 1.2, w: 12, h: 0.6, fontSize: 22, bold: true, color: '1b4293' });
            (s.options || []).forEach((opt, i) => {
              slide.addShape(pptx.ShapeType.rect, { x: 1, y: 2.2 + i * 0.8, w: 10, h: 0.6, fill: { color: 'f1f5f9' }, line: { color: 'cbd5e1' } });
              slide.addText(opt, { x: 1.2, y: 2.2 + i * 0.8, w: 9.5, h: 0.6, fontSize: 14, color: '334155' });
            });
          } else {
            if (s.subtitle) slide.addText(s.subtitle, { x: 0.5, y: 0.8, w: 12, h: 0.4, fontSize: 14, color: '64748b' });
            if (s.content) slide.addText(s.content, { x: 0.5, y: 1.5, w: 12, h: 4.5, fontSize: 14, color: '333333', valign: 'top', wrap: true });
            if (s.image) {
              try {
                slide.addImage({ path: this.resolveUrl(s.image), x: 7, y: 2, w: 5, h: 3.5, sizing: { type: 'contain' } });
              } catch(e) { /* skip failed images */ }
            }
          }
          // Gold corner
          slide.addShape(pptx.ShapeType.rect, { x: 0, y: 7, w: '100%', h: 0.5, fill: { color: 'e6e6e6' } });
          slide.addText(String(this.slides.indexOf(s) + 1), { x: 12.2, y: 6.5, w: 0.5, h: 0.5, fontSize: 10, color: 'FFFFFF', fill: { color: '1b4293' }, align: 'center', valign: 'middle' });
        }
        await pptx.writeFile({ fileName: 'PEDRRA_Presentation.pptx' });
      } catch (e) { this.showError('PPTX export failed: ' + e.message); }
    },
    escHtml(str) {
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    },
    toggleDarkMode() {
      this.darkMode = !this.darkMode;
      localStorage.setItem('darkMode', this.darkMode);
      document.documentElement.setAttribute('data-theme', this.darkMode ? 'dark' : 'light');
    },
    async resetAllAnswers() {
      if (!confirm('This will delete ALL poll and survey answers for ALL slides. Are you sure?')) return;
      try {
        const res = await authFetch(`${baseUrl}/api/answers`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to reset answers');
        this.userMessage = 'All answers have been reset.';
        this.pollResults = [];
        this.pollProgress = { answered: 0, total: 0 };
        setTimeout(() => this.userMessage = '', 3000);
      } catch (e) { this.showError(e.message); }
    },
    // Freeze mode
    toggleFreeze() {
      this.frozen = !this.frozen;
      this.socket.emit('slide:freeze', this.frozen);
    },
    // Hand raise
    clearHands() {
      this.socket.emit('hand:clearAll');
    },
    // Auto-save
    _setupAutoSave() {
      clearInterval(this.autoSaveInterval);
      if (this.autoSaveEnabled) {
        this.autoSaveInterval = setInterval(() => {
          if (this.hasUnsavedChanges && this.activeTab === 'content') {
            this.autoSaveStatus = 'saving';
            this.autoSaveLabel = 'Saving...';
            this.saveSlides().then(() => {
              this.hasUnsavedChanges = false;
              this.autoSaveStatus = 'saved';
              this.autoSaveLabel = '✓ Saved';
              setTimeout(() => { this.autoSaveStatus = ''; this.autoSaveLabel = ''; }, 3000);
            });
          }
        }, 30000);
      }
    },
    // Timer methods
    startTimer() {
      const dur = this.currentSlide.duration || 300;
      this.socket.emit('timer:start', { slideId: this.currentSlide.id, duration: dur });
      this.timerSeconds = dur;
      this.timerRunning = true;
      this._startTimerTick();
    },
    pauseTimer() {
      this.socket.emit('timer:pause', this.currentSlide.id);
      this.timerRunning = false;
      clearInterval(this.timerInterval);
    },
    resumeTimer() {
      this.socket.emit('timer:resume', this.currentSlide.id);
      this.timerRunning = true;
      this._startTimerTick();
    },
    resetTimer() {
      this.socket.emit('timer:reset', this.currentSlide.id);
      this.timerRunning = false;
      this.timerSeconds = this.currentSlide.duration || 300;
      clearInterval(this.timerInterval);
    },
    async openWheel() {
      try {
        const res = await authFetch(`${baseUrl}/api/attendees`);
        if (res.ok) this.wheelAttendees = await res.json();
      } catch (e) { /* ignore */ }
      this.showWheel = true;
      this.slotItems = [...this.wheelAttendees];
      this.slotOffset = 0;
      this.fullscreenWheelWinner = null;
    },
    onWheelResult(winner) {
      if (this.socket) {
        this.socket.emit('wheel:result', winner);
        this.socket.emit('wheel:spinning');
      }
    },
    async openLeaderboard() {
      try {
        const res = await authFetch(`${baseUrl}/api/quiz/leaderboard`);
        if (res.ok) this.leaderboardEntries = await res.json();
      } catch (e) { /* ignore */ }
      this.showLeaderboard = true;
    },
    showQROverlay() {
      this.showQR = !this.showQR;
    },
    spinSlotMachine() {
      if (this.wheelSpinState || this.wheelAttendees.length < 2) return;
      this.fullscreenWheelWinner = null;
      this.wheelSpinState = true;

      // Build a long list of shuffled items to scroll through
      const items = [];
      const totalCycles = 8 + Math.floor(Math.random() * 4); // 8-12 full cycles
      for (let c = 0; c < totalCycles; c++) {
        const shuffled = [...this.wheelAttendees].sort(() => Math.random() - 0.5);
        items.push(...shuffled);
      }
      // Pick winner and put at the end
      const winnerIdx = Math.floor(Math.random() * this.wheelAttendees.length);
      const winner = this.wheelAttendees[winnerIdx];
      items.push(winner);
      this.slotItems = items;

      // Animate: start fast, decelerate to stop on the last item
      const itemH = 70; // px per item
      const totalItems = items.length;
      const targetOffset = -((totalItems - 1) * itemH) + itemH; // center the last item
      const duration = 4500; // total animation time ms
      const startTime = performance.now();
      const startOffset = 0;
      this.slotOffset = startOffset;

      const animate = (now) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Ease out cubic for dramatic slow-down
        const eased = 1 - Math.pow(1 - progress, 3);
        this.slotOffset = startOffset + (targetOffset - startOffset) * eased;

        if (progress < 1) {
          this.slotAnimFrame = requestAnimationFrame(animate);
        } else {
          this.slotOffset = targetOffset;
          this.wheelSpinState = false;
          this.fullscreenWheelWinner = winner;
        }
      };
      this.slotAnimFrame = requestAnimationFrame(animate);
    },
    async loadAnalytics() {
      try {
        const res = await authFetch(`${baseUrl}/api/analytics`);
        if (res.ok) this.analytics = await res.json();
      } catch (e) { this.showError('Failed to load analytics'); }
    },
    exportAnalyticsPDF() {
      if (!this.analytics) return;
      const a = this.analytics;
      const w = window.open('', '_blank');
      let html = `<html><head><title>PEDRRA Analytics Report</title><style>body{font-family:'Segoe UI',sans-serif;padding:2rem;color:#333;}h1{color:#1b4293;}table{width:100%;border-collapse:collapse;margin:1rem 0;}th,td{padding:0.5rem;border:1px solid #e2e8f0;text-align:left;}th{background:#f1f5f9;}</style></head><body>`;
      html += `<h1>📈 PEDRRA Session Analytics Report</h1>`;
      html += `<p>Generated: ${new Date().toLocaleString()}</p>`;
      html += `<h2>Summary</h2><table><tr><th>Metric</th><th>Value</th></tr>`;
      html += `<tr><td>Total Attendees</td><td>${a.totalAttendees}</td></tr>`;
      html += `<tr><td>Total Responses</td><td>${a.totalResponses}</td></tr>`;
      html += `<tr><td>Slides with Answers</td><td>${a.slidesWithAnswers}</td></tr></table>`;
      if (a.responsesPerSlide?.length) {
        html += `<h2>Responses per Slide</h2><table><tr><th>Slide</th><th>Responses</th></tr>`;
        a.responsesPerSlide.forEach(s => { html += `<tr><td>Slide ${s.slide_id}</td><td>${s.responses}</td></tr>`; });
        html += `</table>`;
      }
      if (a.quizLeaderboard?.length) {
        html += `<h2>Quiz Leaderboard</h2><table><tr><th>#</th><th>Username</th><th>Points</th><th>Correct</th></tr>`;
        a.quizLeaderboard.forEach((q, i) => { html += `<tr><td>${i+1}</td><td>${q.username}</td><td>${q.total_points}</td><td>${q.correct}</td></tr>`; });
        html += `</table>`;
      }
      html += `</body></html>`;
      w.document.write(html);
      w.document.close();
      w.onload = () => w.print();
    },
    openPresenterMode() {
      // Open a second window showing the attendee view
      const url = window.location.origin + '/attendee';
      this.presenterWindow = window.open(url, 'presenter', 'width=1024,height=576');
    },
    async loadSessionCode() {
      try {
        const res = await fetch(`${baseUrl}/api/session-code`);
        if (res.ok) { const d = await res.json(); this.sessionCode = d.code; }
      } catch (e) { /* ignore */ }
    },
    _playTimerEndSound() {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const playTone = (freq, start, dur) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine'; osc.frequency.value = freq;
          gain.gain.setValueAtTime(0.3, ctx.currentTime + start);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + start + dur);
          osc.connect(gain).connect(ctx.destination);
          osc.start(ctx.currentTime + start); osc.stop(ctx.currentTime + start + dur);
        };
        playTone(523, 0, 0.2); playTone(659, 0.25, 0.2); playTone(784, 0.5, 0.4);
      } catch (e) { /* audio not supported */ }
    },
    _startTimerTick() {
      clearInterval(this.timerInterval);
      this.timerInterval = setInterval(() => {
        if (this.timerSeconds > 0) {
          this.timerSeconds--;
          if (this.timerSeconds === 0) { this._playTimerEndSound(); this.timerRunning = false; clearInterval(this.timerInterval); }
        } else {
          this.timerRunning = false;
          clearInterval(this.timerInterval);
        }
      }, 1000);
    },
    _handleTimerUpdate(state) {
      clearInterval(this.timerInterval);
      if (!state) { this.timerSeconds = this.currentSlide.duration || 300; this.timerRunning = false; return; }
      if (state.paused) {
        const elapsed = Math.floor((state.pausedAt - state.startTime) / 1000);
        this.timerSeconds = Math.max(0, state.duration - elapsed);
        this.timerRunning = false;
      } else {
        const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
        this.timerSeconds = Math.max(0, state.duration - elapsed);
        this.timerRunning = this.timerSeconds > 0;
        if (this.timerRunning) this._startTimerTick();
      }
    },
    logout() {
      clearAuth();
      this.$router.push('/');
    }
  }
}
</script>
