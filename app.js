/**
 * Jandos-TV - Aplicación Nativa Samsung Smart TV (Tizen OS)
 * Diseñado con cero fricción, altísimo contraste y parrilla curada por bloques VIP:
 * 1. Nacionales Perú (01-12)
 * 2. Deportes (13-20)
 * 3. Series y Anime 24/7 (21-26) [Maratón Continua y Selector de Capítulos en Orden]
 * 4. Cine, Cultura y Regionales (27+)
 */

(function () {
    'use strict';

    // --------------------------------------------------------------------------
    // 1. Constantes y Configuración Remota
    // --------------------------------------------------------------------------
    const CUSTOM_REMOTE_JSON_URL = 'https://raw.githubusercontent.com/SandoBall10/jandos-tv/main/canales-remotos.json';
    const LOCAL_FALLBACK_JSON_URL = './canales-remotos.json';
    const LOCAL_SERIES_CATALOGO_URL = './series-catalogo.json';
    const REMOTE_CONFIG_INTERVAL_MS = 30 * 60 * 1000; // 30 minutos

    const STORAGE_KEY_LAST_CHANNEL = 'jandos_tv_last_channel_index';
    const STORAGE_KEY_SERIES_PROGRESS = 'jandos_series_progress';
    const OSD_DURATION_MS = 4000;
    const NUMBER_BUFFER_TIMEOUT_MS = 1800;
    const STREAM_TIMEOUT_MS = 8000;
    const CHANNEL_WATCHDOG_MS = 15000;
    const CORS_TEST_ORIGIN = 'http://localhost:3000';

    // --------------------------------------------------------------------------
    // 2. Parrilla Base Curada (Respaldada por canales-remotos.json)
    // --------------------------------------------------------------------------
    let channels = [
        { id: 1, name: 'Latina Televisión', category: 'NACIONALES', urls: ['http://190.93.224.42/LATINA/index.m3u8'] },
        { id: 2, name: 'América Televisión', category: 'NACIONALES', urls: ['https://live-bd1.tv360.bitel.com.pe/manifest/america/master_clean_source.m3u8'] },
        { id: 3, name: 'Panamericana TV', category: 'NACIONALES', urls: ['http://45.171.108.253:8888/PANAMERICANA/index.m3u8', 'http://190.93.224.42/PANAMERICANA/index.m3u8'] },
        { id: 4, name: 'TV Perú', category: 'NACIONALES', urls: ['http://190.93.224.42/TV-PERU/index.m3u8'] },
        { id: 5, name: 'ATV', category: 'NACIONALES', urls: ['http://190.93.224.42/ATV/index.m3u8'] },
        { id: 6, name: 'ATV+', category: 'NACIONALES', urls: ['http://45.171.108.253:8888/ATV/index.m3u8', 'http://190.93.224.42/ATV-SUR/index.m3u8'] },
        { id: 7, name: 'TV Perú Noticias', category: 'NACIONALES', urls: ['http://190.93.224.42/TV-PERU-NOTICIAS/index.m3u8'] },
        { id: 8, name: 'Willax TV', category: 'NACIONALES', urls: ['http://190.93.224.42/WILLAX/index.m3u8'] },
        { id: 9, name: 'Exitosa TV', category: 'NACIONALES', urls: ['http://190.93.224.42/EXITOSA/index.m3u8'] },
        { id: 10, name: 'Nativa TV', category: 'NACIONALES', urls: ['http://187.102.210.46/NATIVATV/index.m3u8'] },
        { id: 11, name: 'Congreso TV', category: 'NACIONALES', urls: ['http://190.93.224.42/JUSTICIA-TV/index.m3u8'] },
        { id: 12, name: 'Sol TV', category: 'NACIONALES', urls: ['https://cloudpro.servidoresdestream.com:8081/8010/index.m3u8', 'https://cdn.streamhispanatv.net:3409/live/soltvlive.m3u8'] },
        // Deportes
        { id: 13, name: 'L1 MAX (Liga 1 Max)', category: 'DEPORTES', urls: ['https://cablered.iptvperu.tv:1936/cablered/liga1max.stream/playlist.m3u8'] },
        { id: 14, name: 'GOLPERU', category: 'DEPORTES', urls: ['http://190.93.224.42/GOLPERU/index.m3u8'] },
        { id: 15, name: 'Movistar Deportes', category: 'DEPORTES', urls: ['http://170.244.209.30:8000/play/a1i8/index.m3u8'] },
        { id: 16, name: 'ESPN', category: 'DEPORTES', urls: ['https://barinaslive1.boldmss.com/ESPN/ESPN.isml/ESPN.m3u8'] },
        { id: 17, name: 'ESPN 2', category: 'DEPORTES', urls: ['https://barinaslive1.boldmss.com/ESPN_2/ESPN_2.isml/ESPN_2.m3u8'] },
        { id: 18, name: 'DSports (DirecTV)', category: 'DEPORTES', urls: ['http://45.170.130.224:8000/play/a03d/index.m3u8'] },
        { id: 19, name: 'Claro Sports', category: 'DEPORTES', urls: ['http://168.196.127.137:6001/play/a08r/index.m3u8'] },
        { id: 20, name: 'TyC Sports / TUDN', category: 'DEPORTES', urls: ['https://amg26268-amg26268c14-freelivesports-emea-10267.playouts.now.amagi.tv/ts-us-e2-n2/playlist/amg26268-sportsstudio-tycsports-freelivesportsemea/playlist.m3u8'] },
        // Series y Anime 24/7 (21 a 26)
        { id: 21, name: 'El Chavo del 8 (24/7)', category: 'SERIES Y ANIME', slug: 'el-chavo-del-8', urls: [] },
        { id: 22, name: 'La Familia Ingalls (24/7)', category: 'SERIES Y ANIME', slug: 'la-familia-ingalls', urls: [] },
        { id: 23, name: 'Dragon Ball Z (24/7)', category: 'SERIES Y ANIME', slug: 'dragon-ball-z', urls: [] },
        { id: 24, name: 'Caballeros del Zodiaco (24/7)', category: 'SERIES Y ANIME', slug: 'caballeros-del-zodiaco', urls: [] },
        { id: 25, name: 'Supercampeones (24/7)', category: 'SERIES Y ANIME', slug: 'supercampeones', urls: [] },
        { id: 26, name: 'Death Note (24/7)', category: 'SERIES Y ANIME', slug: 'death-note', urls: [] }
    ];

    // Catálogo maestro de Series y Capítulos
    let seriesCatalog = [];

    // --------------------------------------------------------------------------
    // 3. Estado de la Aplicación
    // --------------------------------------------------------------------------
    let currentChannelIndex = 0;
    let previousChannelIndex = 0;
    let currentStreamUrlIndex = 0;
    let guideFocusedIndex = 0;
    let isGuideOpen = false;

    // Estado del Modo Series / Maratón Continua
    let isSeriesMode = false;
    let currentPlayingSeries = null;
    let currentPlayingEpisodeIndex = 0;

    // Estado de la Guía Lateral con Pestañas
    let guideCurrentTab = 'channels'; // 'channels' | 'series'
    let seriesViewState = 'series-list'; // 'series-list' | 'episodes-list'
    let seriesFocusedIndex = 0;
    let selectedSeriesForEpisodes = null;
    let episodeFocusedIndex = -1; // -1 = Botón "CONTINUAR VIENDO", 0..N = Capítulos

    // Temporizadores
    let osdTimer = null;
    let numberBufferTimer = null;
    let numberBuffer = '';
    let streamLoadTimeoutTimer = null;
    let channelWatchdogTimer = null;
    let seekNoticeTimer = null;

    // Reproductor HLS
    let hlsInstance = null;

    // Elementos del DOM
    const videoEl = document.getElementById('tv-player') || document.getElementById('player');
    const muteNoticeEl = document.getElementById('mute-notice');
    const seekNoticeEl = document.getElementById('seek-notice');
    const osdEl = document.getElementById('osd');
    const osdBadgeEl = document.getElementById('osd-badge');
    const osdNumberEl = document.getElementById('osd-number');
    const osdNameEl = document.getElementById('osd-name');
    const osdClockEl = document.getElementById('osd-clock');
    const osdLiveTagEl = document.getElementById('osd-live-tag');
    const osdHintEl = document.getElementById('osd-hint');
    const numberDialerEl = document.getElementById('number-dialer');
    const dialerDigitsEl = document.getElementById('dialer-digits');
    const channelGuideEl = document.getElementById('channel-guide');
    const guideListEl = document.getElementById('guide-list');
    const tabChannelsEl = document.getElementById('tab-channels');
    const tabSeriesEl = document.getElementById('tab-series');
    const seriesGuideContainerEl = document.getElementById('series-guide-container');
    const seriesListEl = document.getElementById('series-list');
    const seriesEpisodesPanelEl = document.getElementById('series-episodes-panel');
    const episodesSeriesTitleEl = document.getElementById('episodes-series-title');
    const episodesContinueBtnEl = document.getElementById('episodes-continue-btn');
    const continueBtnTextEl = document.getElementById('continue-btn-text');
    const episodesListEl = document.getElementById('episodes-list');
    const statusOverlayEl = document.getElementById('status-overlay');
    const statusTextEl = document.getElementById('status-text');
    const statusSubtextEl = document.getElementById('status-subtext');

    // --------------------------------------------------------------------------
    // 4. Inicialización de Tizen y Teclas del Control Remoto
    // --------------------------------------------------------------------------
    function initTizenFeatures() {
        if (window.tizen && window.tizen.tvinputdevice) {
            const keysToRegister = [
                'ChannelUp', 'ChannelDown',
                '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
                'MediaPlay', 'MediaPause', 'MediaFastForward', 'MediaRewind'
            ];
            keysToRegister.forEach(function (keyName) {
                try {
                    window.tizen.tvinputdevice.registerKey(keyName);
                } catch (err) {
                    console.warn('Jandos-TV: No se pudo registrar la tecla ' + keyName, err);
                }
            });
        }

        try {
            if (window.tizen && window.tizen.power) {
                window.tizen.power.request('SCREEN', 'SCREEN_NORMAL');
                console.log('Jandos-TV: Pantalla bloqueada contra protector (SCREEN_NORMAL)');
            }
        } catch (e) {
            console.warn('Jandos-TV: No se pudo solicitar tizen.power', e);
        }
    }

    // --------------------------------------------------------------------------
    // 5. Utilidades de Progreso en LocalStorage
    // --------------------------------------------------------------------------
    function getSeriesSlug(item) {
        if (!item) return 'serie';
        if (item.slug) return item.slug;
        const n = (item.seriesTitle || item.name || '').toLowerCase();
        if (n.includes('chavo')) return 'el-chavo-del-8';
        if (n.includes('ingalls') || n.includes('pradera')) return 'la-familia-ingalls';
        if (n.includes('dragon ball')) return 'dragon-ball-z';
        if (n.includes('zodiaco') || n.includes('seiya')) return 'caballeros-del-zodiaco';
        if (n.includes('supercampeones') || n.includes('tsubasa')) return 'supercampeones';
        if (n.includes('death note')) return 'death-note';
        return n.replace(/[^a-z0-9]+/g, '-');
    }

    function getAllSeriesProgress() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY_SERIES_PROGRESS);
            return raw ? JSON.parse(raw) : {};
        } catch (e) {
            return {};
        }
    }

    function getSeriesProgress(slug) {
        const all = getAllSeriesProgress();
        return all[slug] || null;
    }

    function saveSeriesProgress(slug, episodeIndex, num, title) {
        try {
            const all = getAllSeriesProgress();
            all[slug] = {
                episodeIndex: episodeIndex,
                num: num,
                title: title,
                timestamp: Date.now()
            };
            localStorage.setItem(STORAGE_KEY_SERIES_PROGRESS, JSON.stringify(all));
        } catch (e) {
            console.warn('No se pudo guardar progreso de series:', e);
        }
    }

    // --------------------------------------------------------------------------
    // 6. Reloj Gigante de Perú y Notificaciones OSD
    // --------------------------------------------------------------------------
    function getPeruTime12H() {
        try {
            const now = new Date();
            return now.toLocaleTimeString('en-US', {
                timeZone: 'America/Lima',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
        } catch (e) {
            const now = new Date();
            let hours = now.getHours();
            const minutes = now.getMinutes();
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            hours = hours ? hours : 12;
            const strMinutes = minutes < 10 ? '0' + minutes : minutes;
            const strHours = hours < 10 ? '0' + hours : hours;
            return strHours + ':' + strMinutes + ' ' + ampm;
        }
    }

    function formatChannelNumber(index) {
        const num = index + 1;
        return num < 10 ? '0' + num : '' + num;
    }

    function showOSD() {
        try {
            if (osdClockEl) osdClockEl.textContent = getPeruTime12H();

            if (isSeriesMode && currentPlayingSeries) {
                const ep = currentPlayingSeries.episodes && currentPlayingSeries.episodes[currentPlayingEpisodeIndex];
                const seriesTitle = currentPlayingSeries.seriesTitle || currentPlayingSeries.name;
                if (osdBadgeEl) osdBadgeEl.textContent = 'SERIE 24/7';
                if (osdNumberEl) {
                    osdNumberEl.textContent = currentPlayingSeries.id ? formatChannelNumber(currentPlayingSeries.id - 1) : '🎬';
                }
                if (osdNameEl) {
                    osdNameEl.textContent = seriesTitle + (ep ? ' - ' + ep.title : '');
                }
                if (osdLiveTagEl) osdLiveTagEl.textContent = 'MODO MARATÓN 24/7';
                if (osdHintEl) osdHintEl.textContent = '◄ / ► Adelantar/Retroceder 15s | OK: Guía';
            } else {
                if (!channels || !channels[currentChannelIndex]) return;
                const currentChannel = channels[currentChannelIndex];
                if (osdBadgeEl) osdBadgeEl.textContent = 'CANAL';
                if (osdNumberEl) osdNumberEl.textContent = formatChannelNumber(currentChannelIndex);
                if (osdNameEl) {
                    if (currentChannel.urls && currentChannel.urls.length > 1 && currentStreamUrlIndex > 0) {
                        osdNameEl.textContent = currentChannel.name + ' (Señal ' + (currentStreamUrlIndex + 1) + ' de ' + currentChannel.urls.length + ')';
                    } else {
                        osdNameEl.textContent = currentChannel.name;
                    }
                }
                if (osdLiveTagEl) osdLiveTagEl.textContent = 'SEÑAL EN VIVO';
                if (osdHintEl) osdHintEl.textContent = 'Presiona OK para la lista JANDOS-TV';
            }

            if (osdEl) osdEl.classList.add('visible');
            if (osdTimer) clearTimeout(osdTimer);
            osdTimer = setTimeout(function () {
                if (osdEl) osdEl.classList.remove('visible');
            }, OSD_DURATION_MS);
        } catch (err) {
            console.warn('Jandos-TV: Error en showOSD:', err);
        }
    }

    function showStatus(message, subtext) {
        try {
            if (statusTextEl) statusTextEl.textContent = message || 'Sintonizando canal...';
            if (statusSubtextEl) statusSubtextEl.textContent = subtext || 'Por favor espere un momento';
            if (statusOverlayEl) statusOverlayEl.classList.add('visible');
        } catch (e) {
            console.warn('Jandos-TV: Error en showStatus:', e);
        }
    }

    function hideStatus() {
        try {
            if (statusOverlayEl) statusOverlayEl.classList.remove('visible');
        } catch (e) {
            console.warn('Jandos-TV: Error en hideStatus:', e);
        }
    }

    function showSeekNotice(text) {
        if (!seekNoticeEl) return;
        seekNoticeEl.textContent = text;
        seekNoticeEl.classList.add('visible');
        if (seekNoticeTimer) clearTimeout(seekNoticeTimer);
        seekNoticeTimer = setTimeout(function () {
            seekNoticeEl.classList.remove('visible');
        }, 1200);
    }

    function seekRelative(seconds) {
        if (!videoEl) return;
        try {
            const current = videoEl.currentTime || 0;
            const duration = videoEl.duration || 0;
            let target = current + seconds;
            if (target < 0) target = 0;
            if (duration > 0 && target > duration) target = duration;
            videoEl.currentTime = target;
            const sign = seconds > 0 ? '+' : '';
            showSeekNotice((seconds > 0 ? '⏩ ' : '⏪ ') + sign + seconds + 's');
            showOSD();
        } catch (e) {
            console.warn('Error al hacer seek:', e);
        }
    }

    // --------------------------------------------------------------------------
    // 7. Watchdog, Salto y Reproductor Universal (HLS y MP4 Nativo)
    // --------------------------------------------------------------------------
    function clearStreamTimers() {
        if (streamLoadTimeoutTimer) {
            clearTimeout(streamLoadTimeoutTimer);
            streamLoadTimeoutTimer = null;
        }
        if (channelWatchdogTimer) {
            clearTimeout(channelWatchdogTimer);
            channelWatchdogTimer = null;
        }
    }

    function resetPlayerState() {
        if (hlsInstance) {
            try { hlsInstance.destroy(); } catch (e) {}
            hlsInstance = null;
        }
        if (videoEl) {
            videoEl.pause();
            videoEl.removeAttribute('src');
            videoEl.load();
        }
    }

    function showMuteNotice() {
        if (muteNoticeEl) muteNoticeEl.classList.add('visible');
    }

    function hideMuteNotice() {
        if (muteNoticeEl) muteNoticeEl.classList.remove('visible');
    }

    function forceUnmuteAudio() {
        if (videoEl) {
            videoEl.muted = false;
            videoEl.volume = 1.0;
            hideMuteNotice();
        }
    }

    function unmuteAudioIfNeeded() {
        forceUnmuteAudio();
    }

    function startChannelWatchdog() {
        if (channelWatchdogTimer) clearTimeout(channelWatchdogTimer);
        channelWatchdogTimer = setTimeout(function () {
            console.warn('Jandos-TV Watchdog: 15s sin señal activa en el canal.');
            clearStreamTimers();
            resetPlayerState();
            showStatus('Señal no disponible temporalmente en este canal', 'Presione Arriba/Abajo para cambiar');
            showOSD();
        }, CHANNEL_WATCHDOG_MS);
    }

    function attemptPlayVideo() {
        if (!videoEl) return;
        videoEl.muted = false;
        videoEl.volume = 1.0;

        const playPromise = videoEl.play();
        if (playPromise !== undefined) {
            playPromise.then(function () {
                hideMuteNotice();
                hideStatus();
                if (channelWatchdogTimer) clearTimeout(channelWatchdogTimer);
            }).catch(function (error) {
                console.warn('Jandos-TV: Autoplay con audio bloqueado. Probando con mute temporal:', error);
                videoEl.muted = true;
                videoEl.play().then(function () {
                    showMuteNotice();
                    hideStatus();
                }).catch(function (err) {
                    console.error('Jandos-TV: Falló play con mute:', err);
                });
            });
        }
    }

    // --------------------------------------------------------------------------
    // 8. Reproducción en Modo Maratón / Series y Episodios
    // --------------------------------------------------------------------------
    function playSeriesEpisode(seriesObj, episodeIndex, isChannelContext) {
        if (!seriesObj || !seriesObj.episodes || seriesObj.episodes.length === 0) {
            showStatus('Sin capítulos disponibles', 'Selecciona otra serie');
            return;
        }

        clearStreamTimers();
        resetPlayerState();

        // Normalizar índice de capítulo circular
        let targetEpIdx = episodeIndex;
        if (targetEpIdx < 0) targetEpIdx = 0;
        if (targetEpIdx >= seriesObj.episodes.length) targetEpIdx = 0;

        const ep = seriesObj.episodes[targetEpIdx];
        if (!ep || !ep.url) {
            showStatus('Capítulo no disponible', 'Intente con el siguiente capítulo');
            return;
        }

        isSeriesMode = true;
        currentPlayingSeries = seriesObj;
        currentPlayingEpisodeIndex = targetEpIdx;

        console.log(`Jandos-TV [SERIES]: Reproduciendo ${seriesObj.seriesTitle || seriesObj.name} -> ${ep.title}`);

        const slug = getSeriesSlug(seriesObj);
        saveSeriesProgress(slug, targetEpIdx, ep.num, ep.title);

        showOSD();
        showStatus('Cargando capítulo...', ep.title);

        // Los episodios son archivos .mp4 directos de Internet Archive: reproducir directamente en <video>
        videoEl.src = ep.url;
        videoEl.load();
        attemptPlayVideo();

        if (isGuideOpen) {
            updateGuideActiveChannel();
        }
    }

    // Eventos nativos del reproductor de video
    if (videoEl) {
        videoEl.addEventListener('playing', function () {
            hideStatus();
            clearStreamTimers();
        });

        videoEl.addEventListener('timeupdate', function () {
            if (channelWatchdogTimer) {
                clearTimeout(channelWatchdogTimer);
                channelWatchdogTimer = null;
            }
        });

        // REGLA DE ORO MODO MARATÓN: al finalizar un capítulo, avanza automáticamente al siguiente
        videoEl.addEventListener('ended', function () {
            if (isSeriesMode && currentPlayingSeries && currentPlayingSeries.episodes && currentPlayingSeries.episodes.length > 0) {
                console.log('Jandos-TV [SERIES]: Capítulo finalizado. Avanzando al siguiente automáticamente...');
                const nextEpIdx = (currentPlayingEpisodeIndex + 1) % currentPlayingSeries.episodes.length;
                playSeriesEpisode(currentPlayingSeries, nextEpIdx, true);
            }
        });

        videoEl.addEventListener('error', function (e) {
            console.warn('Jandos-TV: Error en elemento video:', e);
            if (!isSeriesMode) {
                tryNextStreamUrl('Error de decodificación en video');
            }
        });
    }

    // --------------------------------------------------------------------------
    // 9. Sintonización de Canales en Vivo (Modo TV Normal)
    // --------------------------------------------------------------------------
    function playChannel(index) {
        if (!channels || channels.length === 0) return;

        clearStreamTimers();

        let targetIndex = index;
        if (targetIndex < 0) targetIndex = channels.length - 1;
        else if (targetIndex >= channels.length) targetIndex = 0;

        if (targetIndex !== currentChannelIndex) {
            previousChannelIndex = currentChannelIndex;
        }

        currentChannelIndex = targetIndex;
        currentStreamUrlIndex = 0;
        resetPlayerState();

        if (videoEl) {
            videoEl.muted = false;
            videoEl.volume = 1.0;
        }
        hideMuteNotice();

        const channel = channels[currentChannelIndex];
        console.log('Jandos-TV: Sintonizando canal ' + (currentChannelIndex + 1) + ': ' + channel.name);

        try {
            localStorage.setItem(STORAGE_KEY_LAST_CHANNEL, String(currentChannelIndex));
        } catch (e) {
            console.warn('Jandos-TV: No se pudo guardar en localStorage', e);
        }

        // SI ES CANAL DE SERIES Y ANIME 24/7 (CANALES 21 AL 26):
        if (channel.category === 'SERIES Y ANIME' && channel.episodes && channel.episodes.length > 0) {
            const slug = getSeriesSlug(channel);
            const progress = getSeriesProgress(slug);
            let targetEpIdx = 0;

            if (progress && typeof progress.episodeIndex === 'number' && progress.episodeIndex < channel.episodes.length) {
                targetEpIdx = progress.episodeIndex;
            } else if (slug.includes('chavo') || slug.includes('ingalls')) {
                // Episodio aleatorio si no hay progreso previo para El Chavo o La Familia Ingalls
                targetEpIdx = Math.floor(Math.random() * channel.episodes.length);
            } else {
                // Desde el capítulo 1 en orden para Anime (DBZ, Saint Seiya, Supercampeones, Death Note)
                targetEpIdx = 0;
            }

            playSeriesEpisode(channel, targetEpIdx, true);
            return;
        }

        // CANAL NORMAL EN VIVO (HLS):
        isSeriesMode = false;
        currentPlayingSeries = null;

        try { showOSD(); } catch (e) {}
        try { showStatus('Sintonizando ' + channel.name, 'Conectando con la señal...'); } catch (e) {}
        try { updateGuideActiveChannel(); } catch (e) {}

        startChannelWatchdog();
        loadActiveStream();
    }

    function loadActiveStream() {
        resetPlayerState();
        const channel = channels[currentChannelIndex];
        if (!channel || !channel.urls || channel.urls.length === 0) {
            tryNextStreamUrl('Sin URLs HLS disponibles');
            return;
        }

        if (currentStreamUrlIndex >= channel.urls.length) {
            currentStreamUrlIndex = 0;
        }

        const streamUrl = channel.urls[currentStreamUrlIndex];
        console.log('Jandos-TV: Probando stream [' + (currentStreamUrlIndex + 1) + '/' + channel.urls.length + ']: ' + streamUrl);

        if (streamLoadTimeoutTimer) clearTimeout(streamLoadTimeoutTimer);
        streamLoadTimeoutTimer = setTimeout(function () {
            console.warn('Jandos-TV: Timeout de 8s para la señal ' + (currentStreamUrlIndex + 1));
            tryNextStreamUrl('Tiempo de espera agotado');
        }, STREAM_TIMEOUT_MS);

        loadStream(streamUrl);
    }

    function loadStream(streamUrl) {
        if (hlsInstance) {
            try { hlsInstance.destroy(); } catch (e) {}
            hlsInstance = null;
        }

        if (window.Hls && window.Hls.isSupported()) {
            hlsInstance = new window.Hls({
                enableWorker: true,
                lowLatencyMode: false,
                backBufferLength: 30,
                manifestLoadingTimeOut: 10000,
                levelLoadingTimeOut: 10000
            });

            hlsInstance.loadSource(streamUrl);
            hlsInstance.attachMedia(videoEl);

            hlsInstance.on(window.Hls.Events.MANIFEST_PARSED, function (event, data) {
                console.log('Jandos-TV: Manifiesto HLS analizado con éxito.');

                if (data && data.levels && data.levels.length > 0) {
                    let compatibleLevelIndex = -1;
                    for (let i = 0; i < data.levels.length; i++) {
                        const lvl = data.levels[i];
                        const vCodec = (lvl.videoCodec || '').toLowerCase();
                        const aCodec = (lvl.audioCodec || '').toLowerCase();
                        const rawCodecs = (lvl.attrs && lvl.attrs.CODECS ? lvl.attrs.CODECS : '').toLowerCase();

                        const isHevc = vCodec.includes('hvc') || vCodec.includes('hev') || rawCodecs.includes('hvc') || rawCodecs.includes('hev');
                        const isAc3 = aCodec.includes('ac-3') || aCodec.includes('ec-3') || rawCodecs.includes('ac-3') || rawCodecs.includes('ec-3');

                        if (!isHevc && !isAc3) {
                            if (vCodec.includes('avc') || rawCodecs.includes('avc') || (!vCodec && !rawCodecs)) {
                                compatibleLevelIndex = i;
                                break;
                            }
                        }
                    }

                    if (compatibleLevelIndex !== -1 && hlsInstance.currentLevel !== compatibleLevelIndex) {
                        hlsInstance.currentLevel = compatibleLevelIndex;
                    }
                }

                if (hlsInstance.audioTracks && hlsInstance.audioTracks.length > 0) {
                    let targetTrack = 0;
                    for (let t = 0; t < hlsInstance.audioTracks.length; t++) {
                        const track = hlsInstance.audioTracks[t];
                        const lang = (track.lang || track.name || '').toLowerCase();
                        if (lang.includes('es') || lang.includes('spa')) {
                            targetTrack = t;
                            break;
                        }
                    }
                    if (hlsInstance.audioTrack === -1 || hlsInstance.audioTrack === undefined) {
                        hlsInstance.audioTrack = targetTrack;
                    }
                }

                attemptPlayVideo();
            });

            hlsInstance.on(window.Hls.Events.ERROR, function (event, data) {
                const details = data && data.details ? data.details : '';
                console.warn('Jandos-TV: Evento de error HLS:', data.type, details, 'Fatal:', data.fatal);

                if (
                    details === 'bufferAddCodecError' ||
                    details === 'manifestIncompatibleCodecsError' ||
                    details === 'fragParsingError'
                ) {
                    console.warn('Jandos-TV: Incompatibilidad de códecs detectada. Saltando de inmediato...');
                    tryNextStreamUrl('Incompatibilidad de códec detectada');
                    return;
                }

                if (data.fatal) {
                    switch (data.type) {
                        case window.Hls.ErrorTypes.NETWORK_ERROR:
                            console.warn('Jandos-TV: Error de red fatal. Intentando recuperar...');
                            hlsInstance.startLoad();
                            break;
                        case window.Hls.ErrorTypes.MEDIA_ERROR:
                            console.warn('Jandos-TV: Error de medios fatal. Intentando recuperar...');
                            hlsInstance.recoverMediaError();
                            break;
                        default:
                            tryNextStreamUrl('Error fatal de reproducción');
                            break;
                    }
                }
            });
        } else if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
            videoEl.src = streamUrl;
            attemptPlayVideo();
        } else {
            console.error('Jandos-TV: HLS no soportado en este dispositivo.');
            showStatus('Reproductor no compatible', 'Este televisor no soporta transmisiones HLS');
        }
    }

    function tryNextStreamUrl(reason) {
        clearStreamTimers();
        const channel = channels[currentChannelIndex];
        if (!channel || !channel.urls || channel.urls.length === 0) return;

        if (currentStreamUrlIndex + 1 < channel.urls.length) {
            currentStreamUrlIndex++;
            console.log('Jandos-TV: Cambiando a señal de respaldo ' + (currentStreamUrlIndex + 1) + ' para ' + channel.name + ' (' + reason + ')');
            showStatus('Conectando señal de respaldo ' + (currentStreamUrlIndex + 1) + '/' + channel.urls.length, channel.name);
            startChannelWatchdog();
            loadActiveStream();
        } else {
            console.warn('Jandos-TV: Todas las señales probadas fallaron en el canal actual.');
            resetPlayerState();
            showStatus('Señal no disponible temporalmente en este canal', 'Presione Arriba/Abajo para cambiar');
            showOSD();
        }
    }

    function switchNextSignalManual() {
        const channel = channels[currentChannelIndex];
        if (!channel || !channel.urls || channel.urls.length <= 1) {
            showOSD();
            return;
        }
        currentStreamUrlIndex = (currentStreamUrlIndex + 1) % channel.urls.length;
        console.log('Jandos-TV: Cambio manual a señal ' + (currentStreamUrlIndex + 1) + '/' + channel.urls.length);
        showStatus('Cambiando a señal ' + (currentStreamUrlIndex + 1) + '/' + channel.urls.length, channel.name);
        showOSD();
        startChannelWatchdog();
        loadActiveStream();
    }

    // --------------------------------------------------------------------------
    // 10. Guía Rápida Lateral con Pestañas (Canales vs Series en Orden)
    // --------------------------------------------------------------------------
    function renderGuide() {
        if (!guideListEl) return;
        guideListEl.innerHTML = '';
        let lastCategory = null;

        channels.forEach(function (ch, idx) {
            const category = ch.category || (idx < 12 ? 'NACIONALES' : (idx < 20 ? 'DEPORTES' : 'VARIEDADES'));

            if (category !== lastCategory) {
                lastCategory = category;
                const catHeader = document.createElement('div');
                let catClass = 'cat-CINE';
                let catLabel = 'BLOQUE: ' + category;

                if (category === 'NACIONALES') catClass = 'cat-NACIONALES';
                else if (category === 'DEPORTES') catClass = 'cat-DEPORTES';
                else if (category === 'SERIES Y ANIME' || category === 'SERIES') {
                    catClass = 'cat-SERIES';
                    catLabel = '🟠 SERIES Y ANIME 24/7 (MODO MARATÓN)';
                } else if (category === 'DIBUJOS Y ANIMACIÓN' || category === 'DIBUJOS' || category === 'ANIMACION') {
                    catClass = 'cat-ANIMACION';
                    catLabel = '🟡 DIBUJOS Y ANIMACIÓN';
                } else if (category === 'REGIONALES') {
                    catClass = 'cat-REGIONALES';
                }

                catHeader.className = 'guide-category-header ' + catClass;
                catHeader.textContent = catLabel;
                guideListEl.appendChild(catHeader);
            }

            const item = document.createElement('div');
            item.className = 'guide-item';
            item.dataset.index = idx;

            if (idx === currentChannelIndex) {
                item.classList.add('active-playing');
            }
            if (idx === guideFocusedIndex) {
                item.classList.add('focused');
            }

            const numSpan = document.createElement('span');
            numSpan.className = 'guide-item-num';
            numSpan.textContent = formatChannelNumber(idx);

            const nameSpan = document.createElement('span');
            nameSpan.className = 'guide-item-name';
            nameSpan.textContent = ch.name;

            const badgeSpan = document.createElement('span');
            let catBadgeClass = 'cat-CINE';
            let catBadgeText = category;

            if (category === 'NACIONALES') catBadgeClass = 'cat-NACIONALES';
            else if (category === 'DEPORTES') catBadgeClass = 'cat-DEPORTES';
            else if (category === 'SERIES Y ANIME' || category === 'SERIES') {
                catBadgeClass = 'cat-SERIES';
                catBadgeText = 'SERIES 24/7';
            } else if (category === 'DIBUJOS Y ANIMACIÓN' || category === 'DIBUJOS' || category === 'ANIMACION') {
                catBadgeClass = 'cat-ANIMACION';
                catBadgeText = 'ANIMACIÓN';
            } else if (category === 'REGIONALES') catBadgeClass = 'cat-REGIONALES';

            badgeSpan.className = 'guide-item-cat ' + catBadgeClass;
            badgeSpan.textContent = catBadgeText;

            item.appendChild(numSpan);
            item.appendChild(nameSpan);
            item.appendChild(badgeSpan);

            item.addEventListener('click', function () {
                playChannel(idx);
                closeGuide();
            });

            guideListEl.appendChild(item);
        });
    }

    function updateGuideFocus() {
        if (!guideListEl || !guideListEl.querySelectorAll) return;
        const items = guideListEl.querySelectorAll('.guide-item');
        items.forEach(function (item, idx) {
            if (idx === guideFocusedIndex) {
                item.classList.add('focused');
                if (item.scrollIntoView) {
                    item.scrollIntoView({ block: 'center', behavior: 'smooth' });
                }
            } else {
                item.classList.remove('focused');
            }
        });
    }

    function updateGuideActiveChannel() {
        if (!guideListEl || !guideListEl.querySelectorAll) return;
        const items = guideListEl.querySelectorAll('.guide-item');
        items.forEach(function (item, idx) {
            if (idx === currentChannelIndex) {
                item.classList.add('active-playing');
            } else {
                item.classList.remove('active-playing');
            }
        });
    }

    // --------------------------------------------------------------------------
    // 11. Pestaña 2: Selector de Series y Capítulos en Orden
    // --------------------------------------------------------------------------
    function getAvailableSeries() {
        if (seriesCatalog && seriesCatalog.length > 0) {
            return seriesCatalog;
        }
        // Extraer de channels si aún no se ha cargado el JSON específico
        const fromChannels = channels.filter(c => c.category === 'SERIES Y ANIME');
        if (fromChannels.length > 0) {
            return fromChannels;
        }
        return [];
    }

    function renderSeriesList() {
        if (!seriesListEl) return;
        seriesListEl.innerHTML = '';
        const allSeries = getAvailableSeries();

        allSeries.forEach(function (s, idx) {
            const slug = getSeriesSlug(s);
            const progress = getSeriesProgress(slug);
            const numEps = (s.episodes && s.episodes.length) || 0;

            const item = document.createElement('div');
            item.className = 'series-item';
            item.dataset.index = idx;
            if (idx === seriesFocusedIndex) item.classList.add('focused');

            const header = document.createElement('div');
            header.className = 'series-item-header';

            const title = document.createElement('div');
            title.className = 'series-item-title';
            title.textContent = s.seriesTitle || s.name;

            const badge = document.createElement('div');
            badge.className = 'series-item-badge';
            badge.textContent = `${numEps} Caps`;

            header.appendChild(title);
            header.appendChild(badge);

            const subtext = document.createElement('div');
            subtext.className = 'series-item-subtext';
            if (progress && progress.title) {
                subtext.textContent = `▶ Último visto: ${progress.title}`;
            } else {
                subtext.textContent = 'Episodios completos en español latino - Presiona OK para abrir';
            }

            item.appendChild(header);
            item.appendChild(subtext);

            item.addEventListener('click', function () {
                seriesFocusedIndex = idx;
                openEpisodesView(s);
            });

            seriesListEl.appendChild(item);
        });
    }

    function updateSeriesFocus() {
        if (!seriesListEl || !seriesListEl.querySelectorAll) return;
        const items = seriesListEl.querySelectorAll('.series-item');
        items.forEach(function (item, idx) {
            if (idx === seriesFocusedIndex) {
                item.classList.add('focused');
                if (item.scrollIntoView) {
                    item.scrollIntoView({ block: 'center', behavior: 'smooth' });
                }
            } else {
                item.classList.remove('focused');
            }
        });
    }

    function openEpisodesView(seriesObj) {
        selectedSeriesForEpisodes = seriesObj;
        seriesViewState = 'episodes-list';
        episodeFocusedIndex = -1; // Enfocar botón "CONTINUAR VIENDO"

        if (seriesListEl) seriesListEl.style.display = 'none';
        if (seriesEpisodesPanelEl) seriesEpisodesPanelEl.style.display = 'flex';

        if (episodesSeriesTitleEl) {
            episodesSeriesTitleEl.textContent = seriesObj.seriesTitle || seriesObj.name;
        }

        const slug = getSeriesSlug(seriesObj);
        const progress = getSeriesProgress(slug);

        if (continueBtnTextEl) {
            if (progress && progress.title) {
                continueBtnTextEl.textContent = `CONTINUAR VIENDO (${progress.title.split('-')[0].trim()})`;
            } else {
                continueBtnTextEl.textContent = 'COMENZAR DESDE EL CAP. 01';
            }
        }

        renderEpisodesList(seriesObj);
        updateEpisodeFocus();
    }

    function renderEpisodesList(seriesObj) {
        if (!episodesListEl) return;
        episodesListEl.innerHTML = '';
        const episodes = seriesObj.episodes || [];
        const slug = getSeriesSlug(seriesObj);
        const progress = getSeriesProgress(slug);

        episodes.forEach(function (ep, idx) {
            const item = document.createElement('div');
            item.className = 'episode-item';
            item.dataset.index = idx;

            if (idx === episodeFocusedIndex) {
                item.classList.add('focused');
            }

            const numSpan = document.createElement('span');
            numSpan.className = 'episode-item-num';
            const padNum = ep.num < 10 ? '0' + ep.num : '' + ep.num;
            numSpan.textContent = `Cap. ${padNum}`;

            const titleSpan = document.createElement('span');
            titleSpan.className = 'episode-item-title';
            titleSpan.textContent = ep.title.replace(/^Cap\.\s*\d+\s*[-_]\s*/i, '');

            item.appendChild(numSpan);
            item.appendChild(titleSpan);

            if (progress && progress.episodeIndex === idx) {
                const statusSpan = document.createElement('span');
                statusSpan.className = 'episode-item-status';
                statusSpan.textContent = 'ÚLTIMO VISTO';
                item.appendChild(statusSpan);
            }

            item.addEventListener('click', function () {
                episodeFocusedIndex = idx;
                playSeriesEpisode(seriesObj, idx, false);
                closeGuide();
            });

            episodesListEl.appendChild(item);
        });
    }

    function updateEpisodeFocus() {
        if (episodesContinueBtnEl) {
            if (episodeFocusedIndex === -1) {
                episodesContinueBtnEl.classList.add('focused');
                if (episodesContinueBtnEl.scrollIntoView) {
                    episodesContinueBtnEl.scrollIntoView({ block: 'center', behavior: 'smooth' });
                }
            } else {
                episodesContinueBtnEl.classList.remove('focused');
            }
        }

        if (!episodesListEl || !episodesListEl.querySelectorAll) return;
        const items = episodesListEl.querySelectorAll('.episode-item');
        items.forEach(function (item, idx) {
            if (idx === episodeFocusedIndex) {
                item.classList.add('focused');
                if (item.scrollIntoView) {
                    item.scrollIntoView({ block: 'center', behavior: 'smooth' });
                }
            } else {
                item.classList.remove('focused');
            }
        });
    }

    function switchGuideTab(tabName) {
        guideCurrentTab = tabName;
        if (tabName === 'channels') {
            if (tabChannelsEl) tabChannelsEl.classList.add('active');
            if (tabSeriesEl) tabSeriesEl.classList.remove('active');
            if (guideListEl) guideListEl.style.display = 'flex';
            if (seriesGuideContainerEl) seriesGuideContainerEl.style.display = 'none';
            updateGuideFocus();
        } else {
            if (tabChannelsEl) tabChannelsEl.classList.remove('active');
            if (tabSeriesEl) tabSeriesEl.classList.add('active');
            if (guideListEl) guideListEl.style.display = 'none';
            if (seriesGuideContainerEl) seriesGuideContainerEl.style.display = 'flex';

            seriesViewState = 'series-list';
            if (seriesListEl) seriesListEl.style.display = 'flex';
            if (seriesEpisodesPanelEl) seriesEpisodesPanelEl.style.display = 'none';
            renderSeriesList();
            updateSeriesFocus();
        }
    }

    function toggleGuide() {
        if (isGuideOpen) {
            closeGuide();
        } else {
            openGuide();
        }
    }

    function openGuide() {
        isGuideOpen = true;
        guideCurrentTab = 'channels';
        guideFocusedIndex = currentChannelIndex;

        if (tabChannelsEl) tabChannelsEl.classList.add('active');
        if (tabSeriesEl) tabSeriesEl.classList.remove('active');
        if (guideListEl) guideListEl.style.display = 'flex';
        if (seriesGuideContainerEl) seriesGuideContainerEl.style.display = 'none';

        renderGuide();
        channelGuideEl.classList.add('visible');
        updateGuideFocus();
    }

    function closeGuide() {
        isGuideOpen = false;
        channelGuideEl.classList.remove('visible');
    }

    // --------------------------------------------------------------------------
    // 12. Buffer de Entrada Numérica (Teclas 0 a 9)
    // --------------------------------------------------------------------------
    function handleDigitInput(digitChar) {
        if (numberBufferTimer) {
            clearTimeout(numberBufferTimer);
        }

        numberBuffer += digitChar;
        dialerDigitsEl.textContent = numberBuffer;
        numberDialerEl.classList.add('visible');

        numberBufferTimer = setTimeout(function () {
            commitNumberBuffer();
        }, NUMBER_BUFFER_TIMEOUT_MS);
    }

    function commitNumberBuffer() {
        if (!numberBuffer) return;

        const targetChannelNumber = parseInt(numberBuffer, 10);
        numberBuffer = '';
        numberDialerEl.classList.remove('visible');

        if (!isNaN(targetChannelNumber) && targetChannelNumber > 0) {
            const targetIndex = targetChannelNumber - 1;
            if (targetIndex < channels.length) {
                if (isGuideOpen) closeGuide();
                playChannel(targetIndex);
            } else {
                playChannel(channels.length - 1);
            }
        }
    }

    // --------------------------------------------------------------------------
    // 13. Carga y Sincronización Remota de Canales y Series
    // --------------------------------------------------------------------------
    function applyRemoteChannelsConfig(remoteChannels) {
        if (!Array.isArray(remoteChannels) || remoteChannels.length === 0) return;

        console.log('Jandos-TV: Aplicando ' + remoteChannels.length + ' canales curados desde JSON');
        channels = remoteChannels.map(function (rCh, idx) {
            return {
                id: rCh.id || (idx + 1),
                name: rCh.name,
                category: rCh.category || (idx < 12 ? 'NACIONALES' : (idx < 20 ? 'DEPORTES' : 'VARIEDADES')),
                slug: rCh.slug || getSeriesSlug(rCh),
                urls: Array.isArray(rCh.urls) ? rCh.urls : (rCh.url ? [rCh.url] : []),
                episodes: Array.isArray(rCh.episodes) ? rCh.episodes : []
            };
        });

        // Actualizar catálogo de series a partir de los canales 21 a 26
        const foundSeries = channels.filter(c => c.category === 'SERIES Y ANIME');
        if (foundSeries.length > 0) {
            seriesCatalog = foundSeries;
        }

        if (isGuideOpen) {
            if (guideCurrentTab === 'channels') renderGuide();
            else if (seriesViewState === 'series-list') renderSeriesList();
        }
    }

    function fetchRemoteJsonConfig() {
        function tryFetch(url) {
            return fetch(url, { cache: 'no-store' })
                .then(function (res) {
                    if (!res.ok) throw new Error('HTTP ' + res.status);
                    return res.json();
                });
        }

        // Cargar series-catalogo.json
        tryFetch(LOCAL_SERIES_CATALOGO_URL)
            .then(function (catData) {
                if (catData && catData.series && catData.series.length > 0) {
                    seriesCatalog = catData.series;
                    console.log('Jandos-TV: Catálogo de series cargado (' + seriesCatalog.length + ' series)');
                }
            })
            .catch(function () {});

        // Cargar canales-remotos.json (GitHub primero, fallback local)
        tryFetch(CUSTOM_REMOTE_JSON_URL)
            .then(function (data) {
                if (data && data.channels && data.channels.length > 0) {
                    console.log('Jandos-TV: Configuración remota GitHub actualizada (' + data.channels.length + ' canales)');
                    applyRemoteChannelsConfig(data.channels);
                }
            })
            .catch(function () {
                return tryFetch(LOCAL_FALLBACK_JSON_URL)
                    .then(function (localData) {
                        if (localData && localData.channels && localData.channels.length > 0) {
                            console.log('Jandos-TV: Configuración local canales-remotos.json aplicada (' + localData.channels.length + ' canales)');
                            applyRemoteChannelsConfig(localData.channels);
                        }
                    })
                    .catch(function (e) {
                        console.warn('Jandos-TV: Usando parrilla base predeterminada', e);
                    });
            });
    }

    // --------------------------------------------------------------------------
    // 14. Controlador de Eventos de Teclado y Control Remoto Samsung
    // --------------------------------------------------------------------------
    function onKeyDown(e) {
        unmuteAudioIfNeeded();

        const keyCode = e.keyCode;

        // Tecla Return / Atrás de Samsung Tizen: 10009 (Escape: 27, Backspace: 8)
        if (keyCode === 10009 || keyCode === 27 || keyCode === 8) {
            e.preventDefault();
            if (isGuideOpen) {
                if (guideCurrentTab === 'series' && seriesViewState === 'episodes-list') {
                    // Volver a la lista de series
                    seriesViewState = 'series-list';
                    if (seriesListEl) seriesListEl.style.display = 'flex';
                    if (seriesEpisodesPanelEl) seriesEpisodesPanelEl.style.display = 'none';
                    updateSeriesFocus();
                } else {
                    closeGuide();
                }
            } else {
                showOSD();
            }
            return;
        }

        // Teclas Numéricas (0 a 9)
        if ((keyCode >= 48 && keyCode <= 57) || (keyCode >= 96 && keyCode <= 105)) {
            let digit = '';
            if (keyCode >= 48 && keyCode <= 57) {
                digit = String(keyCode - 48);
            } else {
                digit = String(keyCode - 96);
            }
            handleDigitInput(digit);
            return;
        }

        // Flecha Arriba (38) y Samsung ChannelUp (427)
        if (keyCode === 38 || keyCode === 427) {
            e.preventDefault();
            if (isGuideOpen) {
                if (guideCurrentTab === 'channels') {
                    guideFocusedIndex = (guideFocusedIndex - 1 + channels.length) % channels.length;
                    updateGuideFocus();
                } else if (seriesViewState === 'series-list') {
                    const allSeries = getAvailableSeries();
                    if (allSeries.length > 0) {
                        seriesFocusedIndex = (seriesFocusedIndex - 1 + allSeries.length) % allSeries.length;
                        updateSeriesFocus();
                    }
                } else if (seriesViewState === 'episodes-list') {
                    if (episodeFocusedIndex > -1) {
                        episodeFocusedIndex--;
                        updateEpisodeFocus();
                    }
                }
            } else {
                playChannel(currentChannelIndex + 1);
            }
            return;
        }

        // Flecha Abajo (40) y Samsung ChannelDown (428)
        if (keyCode === 40 || keyCode === 428) {
            e.preventDefault();
            if (isGuideOpen) {
                if (guideCurrentTab === 'channels') {
                    guideFocusedIndex = (guideFocusedIndex + 1) % channels.length;
                    updateGuideFocus();
                } else if (seriesViewState === 'series-list') {
                    const allSeries = getAvailableSeries();
                    if (allSeries.length > 0) {
                        seriesFocusedIndex = (seriesFocusedIndex + 1) % allSeries.length;
                        updateSeriesFocus();
                    }
                } else if (seriesViewState === 'episodes-list') {
                    const numEps = (selectedSeriesForEpisodes && selectedSeriesForEpisodes.episodes && selectedSeriesForEpisodes.episodes.length) || 0;
                    if (episodeFocusedIndex < numEps - 1) {
                        episodeFocusedIndex++;
                        updateEpisodeFocus();
                    }
                }
            } else {
                playChannel(currentChannelIndex - 1);
            }
            return;
        }

        // Flecha Izquierda (37):
        // En Guía: Cambia a Pestaña 1 (Canales) o Vuelve a Series
        // En Reproducción de Series: Retrocede 15s
        // En Live TV: Recall (Canal anterior)
        if (keyCode === 37) {
            e.preventDefault();
            if (isGuideOpen) {
                if (guideCurrentTab === 'series') {
                    if (seriesViewState === 'episodes-list') {
                        seriesViewState = 'series-list';
                        if (seriesListEl) seriesListEl.style.display = 'flex';
                        if (seriesEpisodesPanelEl) seriesEpisodesPanelEl.style.display = 'none';
                        updateSeriesFocus();
                    } else {
                        switchGuideTab('channels');
                    }
                } else {
                    closeGuide();
                }
            } else if (isSeriesMode) {
                seekRelative(-15);
            } else {
                console.log('Jandos-TV: Recall al canal anterior visto: ' + (previousChannelIndex + 1));
                playChannel(previousChannelIndex);
            }
            return;
        }

        // Flecha Derecha (39):
        // En Guía: Cambia a Pestaña 2 (Series en Orden)
        // En Reproducción de Series: Adelanta 15s
        // En Live TV: Cambio manual de señal HLS
        if (keyCode === 39) {
            e.preventDefault();
            if (isGuideOpen) {
                if (guideCurrentTab === 'channels') {
                    switchGuideTab('series');
                } else if (seriesViewState === 'series-list') {
                    const allSeries = getAvailableSeries();
                    if (allSeries.length > 0 && allSeries[seriesFocusedIndex]) {
                        openEpisodesView(allSeries[seriesFocusedIndex]);
                    }
                }
            } else if (isSeriesMode) {
                seekRelative(+15);
            } else {
                switchNextSignalManual();
            }
            return;
        }

        // Botón OK / Enter (13)
        if (keyCode === 13) {
            e.preventDefault();
            if (isGuideOpen) {
                if (guideCurrentTab === 'channels') {
                    playChannel(guideFocusedIndex);
                    closeGuide();
                } else if (seriesViewState === 'series-list') {
                    const allSeries = getAvailableSeries();
                    if (allSeries.length > 0 && allSeries[seriesFocusedIndex]) {
                        openEpisodesView(allSeries[seriesFocusedIndex]);
                    }
                } else if (seriesViewState === 'episodes-list') {
                    if (selectedSeriesForEpisodes) {
                        const slug = getSeriesSlug(selectedSeriesForEpisodes);
                        const progress = getSeriesProgress(slug);
                        let epIdx = 0;

                        if (episodeFocusedIndex === -1) {
                            // Botón "CONTINUAR VIENDO"
                            if (progress && typeof progress.episodeIndex === 'number') {
                                epIdx = progress.episodeIndex;
                            } else {
                                epIdx = 0;
                            }
                        } else {
                            epIdx = episodeFocusedIndex;
                        }

                        playSeriesEpisode(selectedSeriesForEpisodes, epIdx, false);
                        closeGuide();
                    }
                }
            } else {
                openGuide();
            }
            return;
        }
    }

    // --------------------------------------------------------------------------
    // 15. Arranque de la Aplicación
    // --------------------------------------------------------------------------
    function init() {
        initTizenFeatures();
        document.addEventListener('keydown', onKeyDown, false);
        document.addEventListener('click', unmuteAudioIfNeeded, false);
        document.addEventListener('touchstart', unmuteAudioIfNeeded, false);

        // Eventos click para pestañas con mouse o touch
        if (tabChannelsEl) {
            tabChannelsEl.addEventListener('click', function () {
                switchGuideTab('channels');
            });
        }
        if (tabSeriesEl) {
            tabSeriesEl.addEventListener('click', function () {
                switchGuideTab('series');
            });
        }
        if (episodesContinueBtnEl) {
            episodesContinueBtnEl.addEventListener('click', function () {
                if (selectedSeriesForEpisodes) {
                    const slug = getSeriesSlug(selectedSeriesForEpisodes);
                    const progress = getSeriesProgress(slug);
                    const epIdx = (progress && typeof progress.episodeIndex === 'number') ? progress.episodeIndex : 0;
                    playSeriesEpisode(selectedSeriesForEpisodes, epIdx, false);
                    closeGuide();
                }
            });
        }

        // Recuperar último canal visto desde localStorage (inicia 100% igual en vivo)
        let savedIndex = 0;
        try {
            const raw = localStorage.getItem(STORAGE_KEY_LAST_CHANNEL);
            if (raw !== null) {
                const parsed = parseInt(raw, 10);
                if (!isNaN(parsed) && parsed >= 0) {
                    savedIndex = parsed;
                }
            }
        } catch (e) {
            console.warn(e);
        }

        if (savedIndex >= channels.length) {
            savedIndex = 0;
        }

        // Reproducir de inmediato el canal guardado (para el abuelo)
        playChannel(savedIndex);

        // Cargar configuración de canales curada y series
        fetchRemoteJsonConfig();

        // Consultar periódicamente
        setInterval(fetchRemoteJsonConfig, REMOTE_CONFIG_INTERVAL_MS);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
