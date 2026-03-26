<template>
  <div ref="wrapper" style="position:fixed;inset:0;background:#1a1a2e;display:flex;align-items:center;justify-content:center;overflow:hidden;">

    <!-- #7 — Freeze overlay -->
    <div v-if="frozen" class="freeze-overlay">
      <div class="edps-wait-icon" style="width:60px;height:60px;border-width:4px;margin-bottom:1.5rem;"></div>
      <h2>Please Wait</h2>
      <p>The trainer has paused the session. Content will resume shortly.</p>
    </div>

    <!-- #4 — Progress bar -->
    <div class="progress-bar-track">
      <div class="progress-bar-fill" :style="{width: slideProgressPct + '%'}"></div>
    </div>

    <!-- Top bar -->
    <div style="position:fixed;top:4px;left:0;right:0;z-index:100;display:flex;justify-content:space-between;align-items:center;padding:0.4rem 1.2rem;background:rgba(0,0,0,0.45);">
      <span style="color:rgba(255,255,255,0.7);font-size:0.8rem;">
        <span :style="{display:'inline-block',width:'8px',height:'8px',borderRadius:'50%',marginRight:'6px',background:connected?'#10b981':'#ef4444'}" :title="connected?'Connected':'Disconnected'"></span>
        <img v-if="user?.avatar" :src="resolveUrl(user.avatar)" style="width:20px;height:20px;border-radius:50%;object-fit:cover;vertical-align:middle;margin-right:4px;" />
        {{ user?.display_name || user?.username }}
      </span>
      <span v-if="slideProgress" style="color:rgba(255,255,255,0.5);font-size:0.75rem;margin-right:0.5rem;">{{ slideProgress }}</span>
      <a href="#" @click.prevent="logout" style="color:var(--edps-gold,#dea133);font-weight:bold;text-decoration:none;font-size:0.8rem;">Log Out</a>
    </div>

    <!-- Clock -->
    <div v-show="isSlideVisible" style="position:fixed;top:2.6rem;right:1.4rem;z-index:99;font-size:1.35rem;font-weight:bold;color:white;text-shadow:0 2px 8px rgba(0,0,0,0.9);letter-spacing:2px;font-variant-numeric:tabular-nums;">{{ currentTime }}</div>

    <!-- WAIT SCREEN -->
    <div v-if="!currentSlide || !isSlideVisible" class="edps-presentation" :style="slideTransform">
      <div style="background:var(--edps-blue,#1b4293);width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;">
        <img src="/logo.png" style="height:75px;margin-bottom:1.5rem;opacity:0.9;" onerror="this.style.display='none'" />
        <div class="edps-wait-icon"></div>
        <h2 style="color:white;margin-top:1.5rem;font-size:1.9rem;">Please wait...</h2>
        <p style="color:rgba(255,255,255,0.65);font-size:1rem;">The instructor will start the session shortly.</p>
      </div>
    </div>

    <!-- ACTIVE SLIDE -->
    <div v-else class="edps-presentation" :style="slideTransform">

      <!-- ═══ TITLE SLIDE ═══ -->
      <div v-if="currentSlide.type === 'title'" style="position:relative;width:100%;height:100%;background-image:url('/template/cover_bg.jpg');background-size:cover;background-position:center;overflow:hidden;">
        <!-- EDPS logo (top-left, matching template position) -->
        <div style="position:absolute;top:0.5rem;left:0.5rem;z-index:3;">
          <img src="/template/edps_logo.png" style="height:55px;" onerror="this.style.display='none'" />
        </div>

        <!-- Title text area (right side, over the gold rectangle area of template) -->
        <div style="position:absolute;top:0.5rem;right:1rem;width:48%;z-index:2;padding:1rem;">
          <div style="color:var(--edps-blue,#3B5998);font-size:1.4rem;font-weight:900;line-height:1.4;letter-spacing:0.5px;">{{ currentSlide.title }}</div>
          <div v-if="currentSlide.subtitle" style="color:#555;font-size:0.9rem;margin-top:0.8rem;">{{ currentSlide.subtitle }}</div>
        </div>

        <!-- Content text (bottom-left gold area) -->
        <div v-if="currentSlide.content" style="position:absolute;bottom:6rem;left:2rem;width:30%;color:white;font-size:0.8rem;z-index:2;">{{ currentSlide.content }}</div>

        <!-- Overlaid image if present -->
        <div v-if="currentSlide.image" style="position:absolute;top:42%;left:38%;transform:translate(-50%,-50%);max-width:150px;z-index:5;">
          <img :src="resolveUrl(currentSlide.image)" style="max-width:100%;border-radius:4px;" />
        </div>
      </div>

      <!-- ═══ SECTION TITLE SLIDE ═══ -->
      <div v-else-if="currentSlide.type === 'section'" style="position:relative;width:100%;height:100%;background-image:url('/template/section_bg.png');background-size:cover;background-position:center;overflow:hidden;">
        <!-- Main title box center-left (overlaid on template background) -->
        <div style="position:absolute;top:35%;left:8%;width:42%;padding:1.5rem 2rem;background:var(--edps-blue,#3B5998);">
          <div style="color:white;font-weight:bold;font-size:1.6rem;line-height:1.3;">{{ currentSlide.title }}</div>
          <div v-if="currentSlide.subtitle" style="color:rgba(255,255,255,0.8);font-size:0.95rem;margin-top:0.5rem;">{{ currentSlide.subtitle }}</div>
        </div>
        <!-- Slide number -->
        <div style="position:absolute;bottom:1rem;right:1rem;color:var(--edps-blue,#3B5998);font-size:0.8rem;font-weight:bold;">{{ currentSlideNumber }}</div>
      </div>

      <!-- ═══ CONTENT / POLL / SURVEY ═══ -->
      <template v-else>
        <!-- Header: EDPS logo + title (matches official template) -->
        <div style="display:flex;align-items:center;padding:0.9rem 2rem 0.7rem;flex-shrink:0;">
          <img src="/template/edps_logo.png" style="height:46px;margin-right:1rem;" onerror="this.style.display='none'" />
          <h2 style="margin:0;font-size:1.5rem;font-weight:900;color:var(--edps-blue,#3B5998);">{{ currentSlide.title }}</h2>
        </div>

        <div style="padding:1rem 2rem 4rem;flex:1;overflow-y:auto;position:relative;">
          <div v-if="currentSlide.subtitle" style="color:var(--edps-blue,#1b4293);font-size:1.1rem;font-weight:bold;margin-bottom:1rem;">{{ currentSlide.subtitle }}</div>

          <!-- Content: visual elements or legacy -->
          <template v-if="currentSlide.type === 'content'">
            <template v-if="currentSlide.elements && currentSlide.elements.length">
              <div v-for="el in currentSlide.elements" :key="el.id" :style="elStyle(el)">
                <span v-if="el.kind==='text'" :style="textStyle(el)" v-html="renderMd(el.content)"></span>
                <img v-if="el.kind==='image'" :src="resolveUrl(el.src)" style="width:100%;height:100%;object-fit:contain;" />
                <video v-if="el.kind==='video' && isLocalVideoCheck(el.src)" :src="resolveUrl(el.src)" controls style="width:100%;height:100%;object-fit:contain;"></video>
                <iframe v-else-if="el.kind==='video'" :src="toEmbedUrlCheck(el.src)" style="width:100%;height:100%;border:none;" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
              </div>
            </template>
            <template v-else>
              <div style="line-height:1.8;font-size:1.05rem;color:#333;" v-html="renderMd(currentSlide.content)"></div>
              <div v-if="currentSlide.image" style="margin-top:1rem;text-align:center;"><img :src="resolveUrl(currentSlide.image)" style="max-width:100%;max-height:270px;border-radius:6px;" /></div>
              <div v-if="currentSlide.video" style="margin-top:1rem;">
                <video v-if="isLocalVideoCheck(currentSlide.video)" :src="resolveUrl(currentSlide.video)" controls style="width:100%;max-height:260px;border-radius:6px;"></video>
                <iframe v-else :src="toEmbedUrlCheck(currentSlide.video)" style="width:100%;height:260px;border-radius:6px;border:none;" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
              </div>
            </template>
          </template>

          <!-- Poll -->
          <template v-if="currentSlide.type === 'poll'">
            <div style="font-weight:bold;margin-bottom:1rem;font-size:1.1rem;color:var(--edps-blue,#1b4293);">{{ currentSlide.question }}</div>
            <div v-if="publishedResults">
              <div v-for="opt in currentSlide.options" :key="opt" style="margin-bottom:0.85rem;">
                <div style="display:flex;justify-content:space-between;font-weight:bold;margin-bottom:0.3rem;font-size:0.95rem;">
                  <span :style="{color:currentSlide.correctOption===opt?'#10b981':'inherit'}">{{ opt }} <span v-if="currentSlide.correctOption===opt" style="background:#10b981;color:white;padding:1px 5px;border-radius:3px;font-size:0.72rem;margin-left:0.3rem;">✓</span></span>
                  <span style="color:#64748b;font-size:0.85rem;">{{ publicPollAggregated[opt]||0 }} votes</span>
                </div>
                <div style="background:#e8e8e8;height:18px;border-radius:9px;overflow:hidden;">
                  <div style="height:100%;border-radius:9px;transition:width 0.6s;" :style="{width:getPct(publicPollAggregated[opt])+'%',background:currentSlide.correctOption===opt?'#10b981':'var(--edps-gold,#dea133)'}"></div>
                </div>
              </div>
            </div>
            <div v-else-if="hasAnswered" style="padding:1.2rem;background:#e0f2fe;color:var(--edps-blue,#1b4293);font-weight:bold;border-left:4px solid var(--edps-blue,#1b4293);border-radius:0 6px 6px 0;">✅ Your answer was recorded. Waiting for all participants...</div>
            <div v-else style="display:flex;flex-direction:column;gap:0.6rem;">
              <button v-for="opt in currentSlide.options" :key="opt" @click="submitPollAnswer(opt)" :aria-label="'Vote for: ' + opt"
                style="background:white;color:var(--edps-blue,#1b4293);border:2px solid var(--edps-blue,#1b4293);padding:0.85rem 1.2rem;border-radius:6px;font-weight:bold;font-size:0.95rem;cursor:pointer;text-align:left;transition:all 0.18s;"
                @mouseover="$event.target.style.cssText='background:var(--edps-blue,#1b4293);color:white;border:2px solid var(--edps-blue,#1b4293);padding:0.85rem 1.2rem;border-radius:6px;font-weight:bold;font-size:0.95rem;cursor:pointer;text-align:left;transition:all 0.18s;'"
                @mouseout="$event.target.style.cssText='background:white;color:var(--edps-blue,#1b4293);border:2px solid var(--edps-blue,#1b4293);padding:0.85rem 1.2rem;border-radius:6px;font-weight:bold;font-size:0.95rem;cursor:pointer;text-align:left;transition:all 0.18s;'"
              >{{ opt }}</button>
            </div>
          </template>

          <!-- Survey — DO NOT put inside a scaled container, render normally. React form inputs work perfectly here -->
          <template v-if="currentSlide.type === 'survey'">
            <div style="margin-bottom:1rem;font-size:0.92rem;color:#555;">{{ currentSlide.description }}</div>
            <div v-if="publishedResults" style="padding:1.2rem;background:#f0fdf4;color:#166534;border:1px solid #bbf7d0;border-radius:7px;font-weight:bold;">✅ Survey Complete! Thank you for your responses.</div>
            <div v-else-if="hasAnswered" style="padding:1.2rem;background:#e0f2fe;color:var(--edps-blue,#1b4293);font-weight:bold;border-left:4px solid var(--edps-blue,#1b4293);">✅ Your responses were submitted. Waiting for the session to close...</div>
            <form v-else @submit.prevent="submitSurvey" style="display:flex;flex-direction:column;gap:0.7rem;">
              <div v-for="(q, qi) in currentSlide.questions" :key="qi" style="padding:0.75rem;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;">
                <label style="display:block;font-weight:bold;margin-bottom:0.5rem;color:var(--edps-blue,#1b4293);font-size:0.9rem;">{{ q.text || q }}</label>
                <textarea v-if="q.type==='text'||!q.type" v-model="surveyForm[qi]" rows="2" required style="width:100%;padding:0.45rem;border:1px solid #cbd5e1;border-radius:4px;resize:vertical;font-size:0.88rem;box-sizing:border-box;"></textarea>
                <div v-if="q.type==='rating'" style="display:flex;gap:1.2rem;flex-wrap:wrap;margin-top:0.3rem;">
                  <label v-for="n in 5" :key="n" style="display:flex;flex-direction:column;align-items:center;cursor:pointer;font-weight:bold;font-size:1rem;">
                    <input type="radio" :value="n" v-model="surveyForm[qi]" required style="width:18px;height:18px;margin-bottom:0.2rem;" />{{ n }}
                  </label>
                </div>
                <select v-if="q.type==='choice'" v-model="surveyForm[qi]" required style="width:100%;padding:0.45rem;border:1px solid #cbd5e1;border-radius:4px;font-size:0.88rem;">
                  <option value="" disabled>Select an option...</option>
                  <option v-for="opt in q.options" :key="opt" :value="opt">{{ opt }}</option>
                </select>
              </div>
              <button type="submit" aria-label="Submit survey response" style="background:var(--edps-blue,#1b4293);color:white;border:none;padding:0.75rem;font-size:0.95rem;border-radius:6px;cursor:pointer;font-weight:bold;">Submit Response</button>
            </form>
          </template>

          <!-- Timer -->
          <template v-if="currentSlide.type === 'timer'">
            <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;flex:1;min-height:280px;">
              <div style="position:relative; width:300px; height:300px;">
                <svg viewBox="0 0 200 200" style="width:100%; height:100%; transform:rotate(-90deg);">
                  <circle cx="100" cy="100" r="88" fill="none" stroke="#e2e8f0" stroke-width="8" />
                  <circle cx="100" cy="100" r="88" fill="none" :stroke="timerSeconds <= 10 && timerRunning ? '#ef4444' : timerSeconds <= 30 && timerRunning ? '#f59e0b' : 'var(--edps-blue,#1b4293)'" stroke-width="8" stroke-linecap="round" :stroke-dasharray="553" :stroke-dashoffset="553 - (553 * timerProgress)" style="transition: stroke-dashoffset 1s linear, stroke 0.5s ease; filter: drop-shadow(0 0 6px currentColor);" />
                </svg>
                <div style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); text-align:center;">
                  <div :style="{fontSize:'4.5rem', fontWeight:'bold', fontVariantNumeric:'tabular-nums', color: timerSeconds <= 10 && timerRunning ? '#ef4444' : 'var(--edps-blue,#1b4293)', letterSpacing:'3px', lineHeight:'1', transition:'color 0.5s'}">{{ timerDisplay }}</div>
                  <div style="font-size:0.9rem; color:#94a3b8; margin-top:6px; text-transform:uppercase; letter-spacing:1px;">{{ timerRunning ? '⏱ Time remaining' : (timerSeconds > 0 ? '⏸ Paused' : '⏱ Ready') }}</div>
                </div>
              </div>
            </div>
          </template>

          <!-- Emoji Rating -->
          <template v-if="currentSlide.type === 'rating'">
            <div style="margin-top:1rem;text-align:center;">
              <div style="font-weight:bold;font-size:1.1rem;margin-bottom:1.5rem;">{{ currentSlide.question }}</div>
              <div v-if="hasAnswered" style="padding:1rem;background:#f0fdf4;color:#166534;border-radius:8px;font-weight:bold;">✅ Thanks for your rating!</div>
              <div v-else style="display:flex;gap:1rem;justify-content:center;flex-wrap:wrap;">
                <button v-for="(emoji, i) in ['😡','😕','😐','🙂','😍']" :key="i" @click="submitPollAnswer(String(i+1))" style="font-size:2.5rem;background:none;border:2px solid #e2e8f0;border-radius:12px;padding:0.75rem 1rem;cursor:pointer;transition:all 0.2s;" @mouseenter="$event.target.style.borderColor='var(--edps-blue,#1b4293)';$event.target.style.transform='scale(1.2)'" @mouseleave="$event.target.style.borderColor='#e2e8f0';$event.target.style.transform='scale(1)'">
                  {{ emoji }}
                  <div style="font-size:0.7rem;color:#64748b;margin-top:0.2rem;">{{ ['Terrible','Bad','OK','Good','Excellent'][i] }}</div>
                </button>
              </div>
            </div>
          </template>
        </div>

        <!-- Inline rating (when enabled on this slide) -->
        <div v-if="currentSlide.ratingEnabled" style="position:absolute;bottom:42px;left:0;right:0;display:flex;align-items:center;justify-content:center;gap:0.3rem;padding:0.3rem;background:rgba(255,255,255,0.9);z-index:5;">
          <template v-if="answeredPolls['rating_'+currentSlide.id]">
            <span style="font-size:0.8rem;color:#10b981;font-weight:bold;">✅ Rated!</span>
          </template>
          <template v-else>
            <span style="font-size:0.7rem;color:#64748b;margin-right:0.3rem;">Rate:</span>
            <button v-for="(emoji, i) in ['😡','😕','😐','🙂','😍']" :key="i" @click="submitRating(i+1)" style="font-size:1.3rem;background:none;border:1px solid #e2e8f0;border-radius:6px;padding:0.2rem 0.4rem;cursor:pointer;transition:transform 0.15s;" @mouseenter="$event.target.style.transform='scale(1.2)'" @mouseleave="$event.target.style.transform='scale(1)'">{{ emoji }}</button>
          </template>
        </div>

        <!-- Bottom bar with decorations -->
        <div style="position:absolute;bottom:0;left:0;right:0;height:38px;background:#e6e6e6;flex-shrink:0;"></div>
        <div class="edps-corner-graphics">
          <div class="edps-corner-gold-arc"></div>
          <div class="edps-corner-circle">{{ currentSlideNumber }}</div>
        </div>
      </template>

    </div>

    <!-- Reaction buttons (floating bottom) -->
    <div v-if="isSlideVisible" style="position:fixed;bottom:0.8rem;left:50%;transform:translateX(-50%);z-index:200;display:flex;gap:0.4rem;background:rgba(0,0,0,0.6);padding:0.4rem 0.8rem;border-radius:24px;">
      <button v-for="emoji in reactionEmojis" :key="emoji" @click="sendReaction(emoji)" style="background:none;border:none;font-size:1.4rem;cursor:pointer;padding:0.2rem 0.4rem;transition:transform 0.15s;" @mouseenter="$event.target.style.transform='scale(1.3)'" @mouseleave="$event.target.style.transform='scale(1)'" :title="reactionLabel(emoji)">{{ emoji }}</button>
    </div>

    <!-- ═══ OVERLAYS (broadcast from trainer, visible on projector) ═══ -->

    <!-- Wheel overlay -->
    <div v-if="overlay === 'wheel'" class="pres-overlay">
      <div style="text-align:center;">
        <div style="position:relative;width:320px;height:320px;margin:0 auto;">
          <div :style="{width:'100%',height:'100%',borderRadius:'50%',border:'5px solid white',overflow:'hidden',transition:wheelSpinning?'transform 4s cubic-bezier(0.17,0.67,0.12,0.99)':'none',transform:'rotate('+wheelRotation+'deg)',boxShadow:'0 0 40px rgba(0,0,0,0.4)'}">
            <div v-for="(att, i) in wheelAttendees" :key="i" :style="wedgeStyle(i)" style="display:flex;align-items:center;justify-content:center;overflow:hidden;">
              <span :style="{transform:'rotate('+(90+360/wheelAttendees.length/2)+'deg)',display:'block',fontSize:wheelAttendees.length>10?'0.55rem':'0.7rem',fontWeight:'bold',color:'white',textShadow:'1px 1px 2px rgba(0,0,0,0.6)',maxWidth:'55px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}">{{ att.display_name || att.username }}</span>
            </div>
          </div>
          <div style="position:absolute;top:-14px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:16px solid transparent;border-right:16px solid transparent;border-top:28px solid #e11d48;z-index:10;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3));"></div>
        </div>
        <div v-if="wheelWinner" style="margin-top:1.5rem;padding:1rem 2rem;background:rgba(255,255,255,0.95);border-radius:16px;display:inline-flex;align-items:center;gap:1rem;">
          <span style="font-size:2.5rem;">🎉</span>
          <img v-if="wheelWinner.avatar" :src="resolveUrl(wheelWinner.avatar)" style="width:60px;height:60px;border-radius:50%;object-fit:cover;border:3px solid var(--edps-gold);" />
          <span style="font-size:1.8rem;font-weight:bold;color:var(--edps-blue,#3B5998);">{{ wheelWinner.display_name || wheelWinner.username }}</span>
          <span style="font-size:2.5rem;">🎉</span>
        </div>
      </div>
    </div>

    <!-- Leaderboard overlay -->
    <div v-if="overlay === 'leaderboard'" class="pres-overlay">
      <div style="background:white;border-radius:20px;padding:2rem;width:85%;max-width:550px;max-height:80vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.4);">
        <h2 style="margin:0 0 1rem;text-align:center;color:var(--edps-blue,#3B5998);font-size:2rem;">🏆 Leaderboard</h2>
        <div v-if="leaderboardData.length >= 1" class="podium-container">
          <div v-if="leaderboardData[1]" class="podium-place silver"><div class="podium-rank">🥈</div><img v-if="leaderboardData[1].avatar" :src="resolveUrl(leaderboardData[1].avatar)" class="podium-avatar" /><div class="podium-name">{{ leaderboardData[1].display_name || leaderboardData[1].username }}</div><div class="podium-points">{{ leaderboardData[1].total_points || 0 }} pts</div></div>
          <div class="podium-place gold"><div class="podium-rank">🥇</div><img v-if="leaderboardData[0].avatar" :src="resolveUrl(leaderboardData[0].avatar)" class="podium-avatar" /><div class="podium-name">{{ leaderboardData[0].display_name || leaderboardData[0].username }}</div><div class="podium-points">{{ leaderboardData[0].total_points || 0 }} pts</div></div>
          <div v-if="leaderboardData[2]" class="podium-place bronze"><div class="podium-rank">🥉</div><img v-if="leaderboardData[2].avatar" :src="resolveUrl(leaderboardData[2].avatar)" class="podium-avatar" /><div class="podium-name">{{ leaderboardData[2].display_name || leaderboardData[2].username }}</div><div class="podium-points">{{ leaderboardData[2].total_points || 0 }} pts</div></div>
        </div>
        <div v-for="(e, i) in leaderboardData.slice(3)" :key="e.username" style="display:flex;align-items:center;gap:0.8rem;padding:0.5rem 0.8rem;margin-bottom:0.3rem;background:#f8fafc;border-radius:6px;">
          <span style="width:24px;text-align:center;font-weight:bold;color:#94a3b8;">{{ i+4 }}</span>
          <span style="flex:1;font-weight:600;">{{ e.display_name || e.username }}</span>
          <span style="font-weight:bold;color:var(--edps-blue);">{{ e.total_points || 0 }}</span>
        </div>
      </div>
    </div>

    <!-- QR code sidebar overlay -->
    <div v-if="overlay === 'qr'" class="qr-overlay">
      <div style="font-size:1.3rem;font-weight:bold;color:var(--edps-blue,#3B5998);margin-bottom:1rem;">📱 Join the Session</div>
      <img v-if="qrUrl" :src="qrUrl" style="width:280px;height:280px;border:2px solid #e2e8f0;border-radius:12px;" />
      <div v-if="sessionCode" style="margin-top:1rem;font-size:2.5rem;font-weight:900;color:var(--edps-blue,#3B5998);letter-spacing:8px;">{{ sessionCode }}</div>
      <div style="margin-top:0.5rem;color:#94a3b8;font-size:0.9rem;">Scan QR or enter PIN above</div>
    </div>

    <!-- Hand raise flying notification -->
    <div v-for="hn in handNotifications" :key="hn.id" class="hand-notification">
      <div class="hand-emoji">✋</div>
      <div class="hand-name">{{ hn.name }}</div>
    </div>

    <!-- #13 — Hand raise button -->
    <button v-if="isSlideVisible" :class="['hand-raise-btn', {raised: handRaised}]" @click="toggleHandRaise" :title="handRaised ? 'Lower hand' : 'Raise hand'">
      {{ handRaised ? '🙋' : '✋' }}
    </button>

    <!-- Floating reactions animation -->
    <div style="position:fixed;bottom:3rem;left:50%;transform:translateX(-50%);z-index:199;pointer-events:none;">
      <span v-for="(r, i) in floatingReactions" :key="r.id" style="position:absolute;font-size:2rem;animation:floatUp 2s ease-out forwards;" :style="{left:(r.x)+'px'}">{{ r.emoji }}</span>
    </div>
  </div>
</template>

<script>
import { io } from 'socket.io-client';
import { baseUrl } from '../config.js';
import { marked } from 'marked';
import { getToken, clearAuth } from '../auth.js';
import { toEmbedUrl, isLocalVideo } from '../utils/media.js';

const W = 1024, H = 576;
export default {
  data() {
    return {
      _prevResultsSlideId: null,
      slides: [],
      currentSlideId: null,
      isSlideVisible: false,
      user: null,
      socket: null,
      answeredPolls: {},
      surveyForm: {},
      publishedResults: null,
      currentTime: '',
      clockInterval: null,
      scale: 1,
      binaryPattern: '',
      connected: false,
      timerSeconds: 0,
      timerRunning: false,
      timerInterval: null,
      reactionEmojis: ['👍', '❓', '🐌', '👏', '🎉'],
      floatingReactions: [],
      frozen: false,
      handRaised: false,
      slideTransitionName: 'slide-fade',
      overlay: null,
      wheelAttendees: [],
      wheelRotation: 0,
      wheelSpinning: false,
      wheelWinner: null,
      leaderboardData: [],
      qrUrl: '',
      sessionCode: '',
      handNotifications: [],
    };
  },
  computed: {
    // IMPORTANT: returns a COPY, never mutates the source array
    currentSlide() {
      const s = this.slides.find(s => s.id === this.currentSlideId);
      if (!s) return null;
      if (s.type === 'survey' && Array.isArray(s.questions)) {
        return {
          ...s,
          questions: s.questions.map(q =>
            typeof q === 'string' ? { text: q, type: 'text', options: [] } : q
          ),
        };
      }
      return s;
    },
    currentSlideNumber() {
      return this.slides.findIndex(s => s.id === this.currentSlideId) + 1;
    },
    hasAnswered() {
      return !!this.answeredPolls[this.currentSlideId];
    },
    publicPollAggregated() {
      const counts = {};
      if (!Array.isArray(this.publishedResults)) return counts;
      for (const r of this.publishedResults) counts[r.answer] = (counts[r.answer] || 0) + 1;
      return counts;
    },
    totalPublicAnswers() {
      return Array.isArray(this.publishedResults) ? this.publishedResults.length : 0;
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
    slideProgress() {
      if (!this.currentSlide || !this.isSlideVisible || this.slides.length === 0) return '';
      const idx = this.slides.findIndex(s => s.id === this.currentSlideId);
      if (idx < 0) return '';
      return `Slide ${idx + 1} / ${this.slides.length}`;
    },
    slideProgressPct() {
      if (this.slides.length <= 1) return 0;
      const idx = this.slides.findIndex(s => s.id === this.currentSlideId);
      if (idx < 0) return 0;
      return ((idx + 1) / this.slides.length) * 100;
    },
    slideTransform() {
      return {
        transform: `translate(-50%, -50%) scale(${this.scale})`,
        position: 'absolute', top: '50%', left: '50%',
        width: `${W}px`, height: `${H}px`,
        transformOrigin: 'center center',
      };
    },
  },
  async mounted() {
    this.user = JSON.parse(localStorage.getItem('user'));
    if (!this.user || this.user.role !== 'Attendee') { this.$router.push('/'); return; }

    // Generate binary pattern once
    let bp = '';
    for (let i = 0; i < 900; i++) bp += ((i * 7 + 3) % 11 < 5 ? '1' : '0');
    this.binaryPattern = bp;

    try {
      const r = await fetch(`${baseUrl}/api/slides`);
      this.slides = await r.json();
    } catch(e) { console.error(e); }

    this.socket = io(baseUrl, { auth: { token: getToken() } });

    this.socket.on('connect', () => { this.connected = true; });
    this.socket.on('disconnect', () => { this.connected = false; });
    this.socket.on('connect_error', (err) => {
      if (err.message === 'Authentication failed' || err.message === 'Authentication required') {
        clearAuth();
        this.$router.push('/');
      }
    });

    this.socket.on('slide:current', (id) => {
      if (this.currentSlideId !== id) {
        if (this._prevResultsSlideId) {
          this.socket.off(`poll:results:${this._prevResultsSlideId}`);
          this.socket.off(`timer:update:${this._prevResultsSlideId}`);
        }
        this.surveyForm = {};
        this.publishedResults = null;
        clearInterval(this.timerInterval);
        this.timerRunning = false;
      }
      this.currentSlideId = id;
      this._prevResultsSlideId = id;
      this.socket.on(`poll:results:${id}`, rows => { this.publishedResults = rows; });
      // Listen for timer updates
      this.socket.on(`timer:update:${id}`, state => { this._handleTimerUpdate(state); });
      this.socket.emit('timer:get', id);
    });

    this.socket.on('slide:visibility', v => { this.isSlideVisible = v; });

    // #8 — Fix reactivity: reassign object instead of delete
    this.socket.on('poll:reset', slideId => {
      const sid = String(slideId);
      const newPolls = { ...this.answeredPolls };
      Object.keys(newPolls).forEach(k => { if (String(k) === sid) delete newPolls[k]; });
      this.answeredPolls = newPolls;
      if (String(this.currentSlideId) === sid) {
        this.publishedResults = null;
        this.surveyForm = {};
      }
    });
    this.socket.on('reaction:new', (r) => {
      if (r.username !== this.user?.username) this._showFloatingReaction(r.emoji);
    });
    this.socket.on('poll:resetAll', () => {
      this.answeredPolls = {};
      this.publishedResults = null;
      this.surveyForm = {};
    });

    // Freeze mode
    this.socket.on('slide:freeze', (frozen) => { this.frozen = frozen; });
    // Hand raise cleared by trainer
    this.socket.on('hand:cleared', () => { this.handRaised = false; });

    // Overlay broadcasts from trainer (visible on projector)
    this.socket.on('overlay:show', (data) => {
      this.overlay = data.type;
      if (data.type === 'wheel' && data.attendees) {
        this.wheelAttendees = data.attendees;
        this.wheelWinner = null;
        this.wheelRotation = 0;
        this.wheelSpinning = false;
      }
      if (data.type === 'leaderboard' && data.entries) {
        this.leaderboardData = data.entries;
      }
      if (data.type === 'qr') {
        this.qrUrl = data.qrUrl || '';
        this.sessionCode = data.sessionCode || '';
      }
    });
    this.socket.on('overlay:hide', () => { this.overlay = null; });

    // Wheel spin broadcast
    this.socket.on('wheel:spinning', () => {
      this.wheelSpinning = true;
      this.wheelWinner = null;
      const extraSpins = 5 + Math.floor(Math.random() * 5);
      this.wheelRotation = 360 * extraSpins + Math.floor(Math.random() * 360);
    });
    this.socket.on('wheel:result', (data) => {
      setTimeout(() => {
        this.wheelSpinning = false;
        this.wheelWinner = data;
      }, 4200);
    });

    // Hand raise notification (fly-up animation)
    this.socket.on('hand:raised', (data) => {
      const notif = { id: Date.now() + Math.random(), name: data.display_name || data.username };
      this.handNotifications.push(notif);
      setTimeout(() => { this.handNotifications = this.handNotifications.filter(n => n.id !== notif.id); }, 3500);
    });

    window.addEventListener('resize', this.computeScale);
    this.computeScale();
    const tick = () => { this.currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); };
    tick(); this.clockInterval = setInterval(tick, 1000);
  },
  unmounted() {
    if (this.socket) this.socket.disconnect();
    window.removeEventListener('resize', this.computeScale);
    clearInterval(this.clockInterval);
    clearInterval(this.timerInterval);
  },
  methods: {
    computeScale() {
      this.scale = Math.min(window.innerWidth / W, window.innerHeight / H) * 0.95;
    },
    resolveUrl(url) {
      if (!url) return '';
      return url.startsWith('http') ? url : `${baseUrl}${url}`;
    },
    toEmbedUrlCheck(url) { return toEmbedUrl(url); },
    isLocalVideoCheck(url) { return isLocalVideo(url); },
    elStyle(el) {
      return { position: 'absolute', left: el.x + 'px', top: el.y + 'px', width: el.w + 'px', height: el.h + 'px', overflow: 'hidden' };
    },
    textStyle(el) {
      return { fontSize: el.fontSize + 'px', fontFamily: el.fontFamily || 'Segoe UI', fontWeight: el.bold ? 'bold' : 'normal', fontStyle: el.italic ? 'italic' : 'normal', color: el.color || '#333', textAlign: el.textAlign || 'left', whiteSpace: 'pre-wrap', display: 'block' };
    },
    submitPollAnswer(answer) {
      if (!this.socket || !this.currentSlide) return;
      this.socket.emit('poll:answer', { slideId: this.currentSlide.id, username: this.user.username, answer });
      this.answeredPolls = { ...this.answeredPolls, [this.currentSlide.id]: true };
    },
    submitSurvey() {
      if (!this.socket || !this.currentSlide) return;
      this.socket.emit('poll:answer', { slideId: this.currentSlide.id, username: this.user.username, answer: JSON.stringify(this.surveyForm) });
      this.answeredPolls = { ...this.answeredPolls, [this.currentSlide.id]: true };
    },
    getPct(count) {
      if (!count || !this.totalPublicAnswers) return 0;
      return (count / this.totalPublicAnswers) * 100;
    },
    submitRating(value) {
      if (!this.socket || !this.currentSlide) return;
      const ratingKey = 'rating_' + this.currentSlide.id;
      this.socket.emit('poll:answer', { slideId: ratingKey, username: this.user.username, answer: String(value) });
      this.answeredPolls = { ...this.answeredPolls, [ratingKey]: true };
    },
    renderMd(text) {
      if (!text) return '';
      try { return marked.parse(text, { breaks: true }); } catch { return text; }
    },
    wedgeStyle(i) {
      const COLORS = ['#3B5998','#F0AD4E','#e11d48','#059669','#7c3aed','#d97706','#0891b2','#be185d','#4f46e5','#ca8a04','#0d9488','#dc2626'];
      const n = this.wheelAttendees.length || 1;
      const angle = 360 / n;
      return {
        position:'absolute', width:'50%', height:'50%', top:'0', right:'0',
        transformOrigin:'0% 100%',
        transform:`rotate(${angle*i-90}deg) skewY(${-(90-angle)}deg)`,
        background: COLORS[i % COLORS.length],
      };
    },
    toggleHandRaise() {
      this.handRaised = !this.handRaised;
      if (this.socket) this.socket.emit(this.handRaised ? 'hand:raise' : 'hand:lower');
    },
    sendReaction(emoji) {
      if (this.socket) this.socket.emit('reaction:send', emoji);
      this._showFloatingReaction(emoji);
    },
    _showFloatingReaction(emoji) {
      const r = { id: Date.now() + Math.random(), emoji, x: Math.random() * 60 - 30 };
      this.floatingReactions.push(r);
      setTimeout(() => { this.floatingReactions = this.floatingReactions.filter(f => f.id !== r.id); }, 2000);
    },
    reactionLabel(emoji) {
      const labels = { '👍': 'Like', '❓': 'Question', '🐌': 'Slow down', '👏': 'Applause', '🎉': 'Celebrate' };
      return labels[emoji] || '';
    },
    _playTimerEndSound() {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const playTone = (freq, start, dur) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(0.3, ctx.currentTime + start);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + start + dur);
          osc.connect(gain).connect(ctx.destination);
          osc.start(ctx.currentTime + start);
          osc.stop(ctx.currentTime + start + dur);
        };
        playTone(523, 0, 0.2);
        playTone(659, 0.25, 0.2);
        playTone(784, 0.5, 0.4);
      } catch (e) { /* audio not supported */ }
    },
    _handleTimerUpdate(state) {
      clearInterval(this.timerInterval);
      if (!state) { this.timerSeconds = 0; this.timerRunning = false; return; }
      if (state.paused) {
        const elapsed = Math.floor((state.pausedAt - state.startTime) / 1000);
        this.timerSeconds = Math.max(0, state.duration - elapsed);
        this.timerRunning = false;
      } else {
        const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
        this.timerSeconds = Math.max(0, state.duration - elapsed);
        this.timerRunning = this.timerSeconds > 0;
        if (this.timerRunning) {
          this.timerInterval = setInterval(() => {
            if (this.timerSeconds > 0) {
              this.timerSeconds--;
              if (this.timerSeconds === 0) { this._playTimerEndSound(); this.timerRunning = false; clearInterval(this.timerInterval); }
            } else { this.timerRunning = false; clearInterval(this.timerInterval); }
          }, 1000);
        }
      }
    },
    logout() { clearAuth(); this.$router.push('/'); },
  },
};
</script>
