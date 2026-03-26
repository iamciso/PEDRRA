<template>
  <div class="glass-panel" style="max-width: 1200px; margin: 0 auto; min-height: 85vh;" v-if="!isFullscreen">
    <!-- Header & Tabs -->
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
      <h2 style="margin: 0;">Trainer Dashboard</h2>
      <div style="color: #64748b;">
        <span :style="{display:'inline-block',width:'8px',height:'8px',borderRadius:'50%',marginRight:'6px',background:connected?'#10b981':'#ef4444'}" :title="connected?'Connected':'Disconnected'"></span>
        {{ user?.username }} ({{ user?.team }}) |
        <a href="#" @click.prevent="logout" style="color: var(--primary);">Log Out</a>
      </div>
    </div>
    
    <div class="tabs">
      <button :class="['tab-link', { active: activeTab === 'live' }]" @click="activeTab = 'live'">Live Presentation</button>
      <button :class="['tab-link', { active: activeTab === 'content' }]" @click="activeTab = 'content'">Manage Content</button>
      <button :class="['tab-link', { active: activeTab === 'users' }]" @click="activeTab = 'users'">Manage Users</button>
      <button :class="['tab-link', { active: activeTab === 'results' }]" @click="activeTab = 'results'">📊 Survey Results</button>
      <button :class="['tab-link', { active: activeTab === 'media' }]" @click="activeTab = 'media'">🖼 Media Library</button>
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
        <div v-if="slides.length === 0">Loading slides...</div>
        
        <div v-else class="slide-container" style="flex: 1; border: 1px solid var(--border-color); border-radius: 8px; padding: 2rem; background: #fff;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div class="slide-title" style="margin: 0;">{{ currentSlide.title }}</div>
            <button class="secondary" @click="toggleFullscreen" style="width: auto; padding: 0.2rem 0.5rem; font-size: 0.8rem;">⛶ Enter Fullscreen Mode</button>
          </div>
          <div v-if="currentSlide.subtitle" class="slide-subtitle" style="margin-top: 0.5rem;">{{ currentSlide.subtitle }}</div>
          <div class="slide-content">{{ currentSlide.content || currentSlide.question || currentSlide.description }}</div>
          
          <div v-if="currentSlide.type === 'content' || currentSlide.type === 'title'">
             <div v-if="currentSlide.image" style="margin-top: 1rem; text-align: center;">
                 <img :src="currentSlide.image" style="max-width: 100%; max-height: 300px; border-radius: 4px;" />
             </div>
             <div v-if="currentSlide.video" style="margin-top: 1rem; text-align: center;">
                 <video v-if="isLocalVideoCheck(currentSlide.video)" :src="resolveUrl(currentSlide.video)" controls style="width: 100%; max-height: 350px; border-radius: 8px;"></video>
                 <iframe v-else :src="toEmbedUrlCheck(currentSlide.video)" style="width: 100%; height: 350px; border-radius: 8px;" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
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
          <div v-if="currentSlide.type === 'timer'" style="width: 100%; margin-top: 2rem; text-align: center;">
            <div style="font-size: 4rem; font-weight: bold; font-variant-numeric: tabular-nums; color: var(--primary); letter-spacing: 4px;">{{ timerDisplay }}</div>
            <div style="display: flex; gap: 0.5rem; justify-content: center; margin-top: 1.5rem;">
              <button @click="startTimer" style="width: auto; padding: 0.5rem 1.5rem;">Start</button>
              <button @click="pauseTimer" class="secondary" style="width: auto; padding: 0.5rem 1.5rem;">Pause</button>
              <button @click="resumeTimer" class="secondary" style="width: auto; padding: 0.5rem 1.5rem;">Resume</button>
              <button @click="resetTimer" class="danger" style="width: auto; padding: 0.5rem 1.5rem;">Reset</button>
            </div>
          </div>
        </div>

        <div class="controls" v-if="slides.length > 0" style="display: flex; align-items: center; justify-content: center; margin-top: 1.5rem;">
          <button class="secondary" @click="prevSlide" :disabled="currentIndex === 0">Previous Slide</button>
          <!-- Global Presentation Toggle -->
          <button :class="isSlideVisible ? 'danger' : 'primary'" @click="toggleVisibility" style="margin: 0 1rem; font-weight: bold; padding: 0.75rem 2rem;">
             {{ isSlideVisible ? '🔴 Stop Presentation (Show Wait Screen)' : '🟢 Start Presentation (Live for Attendees)' }}
          </button>
          <button class="secondary" @click="nextSlide" :disabled="currentIndex === slides.length - 1">Next Slide</button>
        </div>
      </div>
      
      <!-- Instructions (Right) -->
      <div>
        <h3>Instructions</h3>
        <ul style="padding-left: 1.2rem; color: #64748b; font-size: 0.9rem; margin-top: 1rem;">
          <li style="margin-bottom: 0.5rem">Click <strong>Start Presentation</strong> to lock the presentation active for the entire session. Students will see what you see.</li>
          <li style="margin-bottom: 0.5rem">When finished, click <strong>Stop Presentation</strong> to force all attendees back to the Wait Screen.</li>
          <li style="margin-bottom: 0.5rem">Click the Fullscreen icon to expand the view to your entire projector. It will look exactly like what the students see!</li>
          <li>In Polls, correctly marked answers will highlight in green dynamically for students. Results are hidden from both of you until all attendees complete the poll.</li>
        </ul>
      </div>
    </div>

    <!-- Tab: Content Management (Rest remains identical) -->
    <!-- Content Editor Start -->
    <div v-if="activeTab === 'content'">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
        <h3>Slides Editor</h3>
        <div>
          <button class="secondary" @click="addSlide('title')" style="width: auto; padding: 0.5rem 1rem; margin-right: 0.5rem;">+ Title Slide</button>
          <button class="secondary" @click="addSlide('content')" style="width: auto; padding: 0.5rem 1rem; margin-right: 0.5rem;">+ Content</button>
          <button class="secondary" @click="addSlide('section')" style="width: auto; padding: 0.5rem 1rem; margin-right: 0.5rem;">+ Section</button>
          <button class="secondary" @click="addSlide('poll')" style="width: auto; padding: 0.5rem 1rem; margin-right: 0.5rem;">+ Live Poll</button>
          <button class="secondary" @click="addSlide('survey')" style="width: auto; padding: 0.5rem 1rem; margin-right: 0.5rem;">+ Survey</button>
          <button class="secondary" @click="addSlide('timer')" style="width: auto; padding: 0.5rem 1rem; margin-right: 0.5rem;">⏱ Timer</button>
          <button @click="saveSlides" style="width: auto; padding: 0.5rem 1rem;">Save Changes</button>
        </div>
      </div>
      <div v-if="saveMessage" style="color: #10b981; font-weight: bold; margin-bottom: 1rem;">{{ saveMessage }}</div>

      <div v-for="(slide, index) in editSlides" :key="slide.id" style="border: 1px solid var(--border-color); padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem; background: #fff;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
          <strong style="font-size: 1.1rem; color: var(--primary);">Slide {{ index + 1 }} ({{ String(slide.type).toUpperCase() }})</strong>
          <div>
             <button class="secondary" style="width: auto; padding: 0.2rem 0.5rem; font-size: 0.8rem; margin-right: 0.5rem;" @click="moveSlide(index, -1)" :disabled="index === 0">↑</button>
             <button class="secondary" style="width: auto; padding: 0.2rem 0.5rem; font-size: 0.8rem; margin-right: 0.5rem;" @click="moveSlide(index, 1)" :disabled="index === editSlides.length - 1">↓</button>
             <button class="danger" style="width: auto; padding: 0.2rem 0.5rem; font-size: 0.8rem;" @click="removeSlide(index)">Delete</button>
          </div>
        </div>
        
        <input v-model="slide.title" placeholder="Slide Title" />
        
        <!-- Content/Title Slide Edit -->
        <template v-if="slide.type === 'content' || slide.type === 'title'">
          <input v-model="slide.subtitle" placeholder="Subtitle (Optional)" />
          <textarea v-model="slide.content" placeholder="Slide Content Text (used in legacy mode)" rows="3"></textarea>
          
          <div style="display: flex; gap: 1rem;">
             <input v-model="slide.image" placeholder="Image URL (legacy, or use Visual Editor)" style="flex: 1;" />
             <input v-model="slide.video" placeholder="Video Embed URL (legacy)" style="flex: 1;" />
          </div>

          <!-- Visual Editor Toggle -->
          <div style="margin-top: 1rem;">
            <button class="secondary" @click="openVisualEditor(slide)" style="width: auto; padding: 0.4rem 1rem; font-size: 0.85rem;">
              {{ slide._showCanvas ? '🔼 Hide Visual Editor' : '🎨 Open Visual Slide Editor' }}
            </button>
            <span style="font-size: 0.78rem; color: #94a3b8; margin-left: 1rem;">Drag & position text, images, videos like PowerPoint</span>
          </div>
          <div v-if="slide._showCanvas" style="margin-top: 1rem;">
            <SlideCanvas v-model="slide.elements" :slideTitle="slide.title" />
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

        <!-- Section Slide Edit -->
        <template v-if="slide.type === 'section'">
          <input v-model="slide.subtitle" placeholder="Subtitle (Optional)" />
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
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr auto; gap: 1rem; align-items: end;">
          <div>
            <label style="font-size: 0.8rem; font-weight: bold; color: #64748b;">Username</label>
            <input v-model="newUser.username" placeholder="jdoe" style="margin-bottom: 0;" />
          </div>
          <div>
            <label style="font-size: 0.8rem; font-weight: bold; color: #64748b;">Password</label>
            <input v-model="newUser.password" type="password" placeholder="***" style="margin-bottom: 0;" />
          </div>
          <div>
            <label style="font-size: 0.8rem; font-weight: bold; color: #64748b;">Team/Unit</label>
            <input v-model="newUser.team" placeholder="DPO" style="margin-bottom: 0;" />
          </div>
          <div>
            <label style="font-size: 0.8rem; font-weight: bold; color: #64748b;">Role</label>
            <select v-model="newUser.role" style="margin-bottom: 0;">
              <option value="Attendee">Attendee</option>
              <option value="Trainer">Trainer (Admin)</option>
            </select>
          </div>
          <button @click="createUser" style="margin-bottom: 0; height: 100%;">Create</button>
        </div>
        <div v-if="userMessage" style="margin-top: 0.5rem; font-size: 0.9rem; color: #10b981;">{{ userMessage }}</div>
      </div>

      <!-- Users Table -->
      <table style="width: 100%; text-align: left; border-collapse: collapse; margin-top: 1rem; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border-radius: 8px; overflow: hidden;">
        <thead style="background: var(--primary); color: white;">
          <tr>
            <th style="padding: 0.75rem 1rem;">ID</th>
            <th style="padding: 0.75rem 1rem;">Username</th>
            <th style="padding: 0.75rem 1rem;">Team/Unit</th>
            <th style="padding: 0.75rem 1rem;">Role</th>
            <th style="padding: 0.75rem 1rem;">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in usersList" :key="u.id" style="border-bottom: 1px solid var(--border-color);">
            <td style="padding: 0.75rem 1rem;">{{ u.id }}</td>
            <td style="padding: 0.75rem 1rem;"><strong>{{ u.username }}</strong></td>
            <td style="padding: 0.75rem 1rem;">{{ u.team }}</td>
            <td style="padding: 0.75rem 1rem;">
              <span :style="{ color: u.role === 'Trainer' ? 'var(--primary)' : '#64748b', fontWeight: u.role === 'Trainer' ? 'bold' : 'normal' }">{{ u.role }}</span>
            </td>
            <td style="padding: 0.75rem 1rem;">
              <button class="danger" style="width: auto; padding: 0.2rem 0.5rem; font-size: 0.8rem;" @click="deleteUser(u.id)" :disabled="u.username === user?.username">Delete</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Tab: Survey Results -->
    <div v-if="activeTab === 'results'">
      <SurveyResults :slides="slides" />
    </div>

    <!-- Tab: Media Library -->
    <div v-if="activeTab === 'media'">
      <MediaManager />
    </div>
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
             <img src="/logo.png" style="height: 60px; margin-right: 1.5rem;" alt="EDPS Logo" />
             <div style="color: var(--edps-blue); font-weight: bold; line-height: 1.2;">
               EUROPEAN<br/>DATA PROTECTION<br/>SUPERVISOR
             </div>
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
        <div v-else-if="currentSlide.type === 'section'" style="position:relative;width:100%;height:100%;background:#d0cdc8;overflow:hidden;">
          <!-- Blue square + white circle - top left -->
          <div style="position:absolute;top:0;left:0;width:90px;height:90px;background:var(--edps-blue,#1b4293);display:flex;align-items:center;justify-content:center;">
            <div style="width:55px;height:55px;background:white;border-radius:50%;"></div>
          </div>
          <!-- Gold arc top-center -->
          <div style="position:absolute;top:0;left:50%;transform:translateX(-50%);width:180px;height:90px;background:var(--edps-gold,#dea133);border-radius:0 0 90px 90px;"></div>
          <!-- White box top-right -->
          <div style="position:absolute;top:0;right:0;width:35%;height:40%;background:white;opacity:0.85;"></div>
          <!-- Main title box center-left -->
          <div style="position:absolute;top:35%;left:8%;width:42%;padding:1.5rem 2rem;background:var(--edps-blue,#1b4293);">
            <div style="color:white;font-weight:bold;font-size:1.6rem;line-height:1.3;">{{ currentSlide.title }}</div>
            <div v-if="currentSlide.subtitle" style="color:rgba(255,255,255,0.8);font-size:0.95rem;margin-top:0.5rem;">{{ currentSlide.subtitle }}</div>
          </div>
          <!-- Gold bottom-left rectangle -->
          <div style="position:absolute;bottom:0;left:0;width:28%;height:30%;background:var(--edps-gold,#dea133);opacity:0.85;"></div>
          <!-- Slide number -->
          <div style="position:absolute;bottom:1rem;right:1rem;color:var(--edps-blue,#1b4293);font-size:0.8rem;font-weight:bold;">{{ currentSlide.id }}</div>
        </div>

        <!-- CONTENT / POLL / SURVEY TEMPLATES -->
        <template v-else>
          <div class="edps-header">
             <img src="/logo.png" style="height: 48px; margin-right: 1.5rem;" alt="EDPS Logo" />
             <h2 class="edps-header-title">{{ currentSlide.title }}</h2>
          </div>

          <div class="edps-content-area" style="overflow-y: auto;">
            <div v-if="currentSlide.subtitle" style="color: var(--edps-blue); font-size: 1.4rem; font-weight: bold; margin-bottom: 2rem;">{{ currentSlide.subtitle }}</div>

            <!-- #11 — Content slide: render visual canvas elements if present -->
            <template v-if="currentSlide.type === 'content'">
              <template v-if="currentSlide.elements && currentSlide.elements.length">
                <div style="position:relative;width:100%;min-height:300px;">
                  <div v-for="el in currentSlide.elements" :key="el.id" :style="{position:'absolute',left:el.x+'px',top:el.y+'px',width:el.w+'px',height:el.h+'px',overflow:'hidden'}">
                    <span v-if="el.kind==='text'" :style="{fontSize:el.fontSize+'px',fontFamily:el.fontFamily||'Segoe UI',fontWeight:el.bold?'bold':'normal',fontStyle:el.italic?'italic':'normal',color:el.color||'#333',textAlign:el.textAlign||'left',whiteSpace:'pre-wrap',display:'block'}">{{ el.content }}</span>
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
                <div style="font-size:6rem;font-weight:bold;font-variant-numeric:tabular-nums;color:var(--edps-blue);letter-spacing:6px;">{{ timerDisplay }}</div>
                <div style="margin-top:1rem;font-size:1.1rem;color:#64748b;">{{ timerRunning ? 'Running...' : (timerSeconds > 0 ? 'Paused' : 'Ready') }}</div>
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

    <!-- Instructor Help overlay for fullscreen -->
    <div style="position: absolute; bottom: 1rem; left: 1rem; color: #94a3b8; font-size: 0.8rem; z-index: 100; text-shadow: 1px 1px 2px rgba(0,0,0,0.5);">
      Press LEFT/RIGHT ARROWS to control slides. ESC to exit.
    </div>

  </div>

</template>

<script>
import { io } from 'socket.io-client';
import { baseUrl } from '../config.js';
import { authFetch, authHeaders } from '../auth.js';
import { toEmbedUrl, isLocalVideo } from '../utils/media.js';
import SurveyResults from './SurveyResults.vue';
import MediaManager from './MediaManager.vue';
import SlideCanvas from './SlideCanvas.vue';

export default {
  components: { SurveyResults, MediaManager, SlideCanvas },
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
      newUser: { username: '', password: '', team: '', role: 'Attendee' },
      userMessage: '',
      currentTime: '',
      clockInterval: null,
      connected: false,
      errorMessage: '',
      timerSeconds: 0,
      timerRunning: false,
      timerInterval: null
    }
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
    timerDisplay() {
      const s = Math.max(0, this.timerSeconds);
      const m = Math.floor(s / 60);
      const sec = s % 60;
      return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
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

    // #6 — Socket auth
    this.socket = io(baseUrl, { auth: { user: JSON.stringify(this.user) } });

    this.socket.on('connect', () => { this.connected = true; });
    this.socket.on('disconnect', () => { this.connected = false; });

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
    clearInterval(this.clockInterval);
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
      const elem = document.documentElement; // Enter full standard web fullscreen
      if (!document.fullscreenElement) {
        elem.requestFullscreen().catch((err) => {
          console.error(`Error attempting to enable fullscreen: ${err.message}`);
        });
      } else {
        document.exitFullscreen();
      }
    },
    migrateQuestions(slidesData) {
        return slidesData.map(s => {
            if (s.type === 'survey' && Array.isArray(s.questions)) {
                s.questions = s.questions.map(q => 
                   typeof q === 'string' ? { text: q, type: 'text', options: [] } : q
                );
            }
            return s;
        });
    },
    showError(msg) {
      this.errorMessage = msg;
      setTimeout(() => { if (this.errorMessage === msg) this.errorMessage = ''; }, 8000);
    },
    async fetchSlides() {
      try {
        const res = await fetch(`${baseUrl}/api/slides`);
        if (!res.ok) throw new Error(`Failed to load slides (${res.status})`);
        const data = await res.json();
        this.slides = this.migrateQuestions(data);
        this.editSlides = JSON.parse(JSON.stringify(this.slides));
      } catch (e) { this.showError(e.message); }
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
          this.newUser = { username: '', password: '', team: '', role: 'Attendee' };
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
    addSlide(type) {
      const id = Date.now();
      if (type === 'poll') {
        this.editSlides.push({ id, type, title: 'New Poll', question: 'What is your question?', correctOption: '', options: ['Option 1', 'Option 2'] });
      } else if (type === 'survey') {
        this.editSlides.push({ id, type, title: 'Survey', description: 'Please answer the following:', questions: [
            { text: 'How do you rate this? (1-5)', type: 'rating', options: [] }, 
            { text: 'Feedback', type: 'text', options: [] }
        ] });
      } else if (type === 'title') {
        this.editSlides.push({ id, type: 'title', title: 'New Topic', subtitle: 'A new section', content: 'Details here', image: '', video: '' });
      } else if (type === 'timer') {
        this.editSlides.push({ id, type: 'timer', title: 'Countdown Timer', duration: 300 });
      } else if (type === 'section') {
        this.editSlides.push({ id, type: 'section', title: 'Section Title', subtitle: '' });
      } else {
        this.editSlides.push({ id, type: 'content', title: 'Content Slide', subtitle: '', content: '', image: '', video: '' });
      }
    },
    removeSlide(index) {
      this.editSlides.splice(index, 1);
    },
    moveSlide(index, direction) {
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= this.editSlides.length) return;
      const slide = this.editSlides.splice(index, 1)[0];
      this.editSlides.splice(targetIndex, 0, slide);
    },
    // #16 — openVisualEditor method
    openVisualEditor(slide) {
      slide._showCanvas = !slide._showCanvas;
    },
    async saveSlides() {
      this.saveMessage = 'Saving...';
      try {
        const res = await authFetch(`${baseUrl}/api/slides`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.editSlides)
        });
        const data = await res.json();
        this.slides = this.migrateQuestions(data.slides);
        this.editSlides = JSON.parse(JSON.stringify(this.slides));
        this.saveMessage = 'Successfully saved!';
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
    _startTimerTick() {
      clearInterval(this.timerInterval);
      this.timerInterval = setInterval(() => {
        if (this.timerSeconds > 0) {
          this.timerSeconds--;
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
      localStorage.removeItem('user');
      this.$router.push('/');
    }
  }
}
</script>
