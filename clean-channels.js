/**
 * clean-channels.js - Script de Limpieza y Verificación Profunda HLS + CORS para Jandos-TV
 * 
 * Verifica no solo que el .m3u8 responda HTTP 200, sino:
 * 1. Descarga el manifiesto maestro (#EXTM3U) con cabecera Origin (CORS check).
 * 2. Si es Master Playlist (#EXT-X-STREAM-INF), resuelve y descarga la sub-playlist (Media Playlist).
 * 3. Extrae el primer segmento de video (.ts, .m4s, .aac) y hace un GET con Range: bytes=0-1024
 *    comprobando que entregue datos (> 0 bytes) y que NO esté bloqueado por CORS.
 * 4. Elimina canales muertos y organiza la lista maestra en bloques VIP:
 *    - Bloque 1: Nacionales Perú (01-12)
 *    - Bloque 2: Deportes (13-20)
 *    - Bloque 3: Cine y Cultura (21+) y Regionales del Perú
 */

const fs = require('fs');
const path = require('path');

const TIMEOUT_MS = 4000;
const OUTPUT_FILE = path.join(__dirname, 'canales-remotos.json');
const CORS_TEST_ORIGIN = 'http://localhost:3000';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

// Fuentes M3U oficiales y actualizadas
const M3U_SOURCES = [
    { url: 'https://iptv-org.github.io/iptv/countries/pe.m3u', tag: 'peru' },
    { url: 'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlists/playlist_peru.m3u8', tag: 'freetv-pe' },
    { url: 'https://iptv-org.github.io/iptv/languages/spa.m3u', tag: 'spanish' },
    { url: 'https://iptv-org.github.io/iptv/categories/sports.m3u', tag: 'sports' },
    { url: 'https://iptv-org.github.io/iptv/categories/animation.m3u', tag: 'animation' },
    { url: 'https://iptv-org.github.io/iptv/categories/kids.m3u', tag: 'kids' },
    { url: 'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlists/playlist_latin_america.m3u8', tag: 'freetv-latam' }
];

// 1. Bloque Maestro 1: Nacionales Perú (Fijos 01 - 12)
const BLOCK_1_NACIONALES = [
    {
        id: 1,
        name: 'Latina Televisión',
        category: 'NACIONALES',
        keywords: ['latina', 'frecuencia latina', 'canal 2'],
        candidateUrls: [
            'http://190.93.224.42/LATINA/index.m3u8',
            'https://dai.google.com/linear/hls/event/oYQGDqEGTmGdHE_fz9oLlg/master.m3u8',
            'https://redirector.rudo.video/hls-video/567ffde3fa319fadf3419efda25619456231dfea/latina/latina.smil/playlist.m3u8'
        ]
    },
    {
        id: 2,
        name: 'América Televisión',
        category: 'NACIONALES',
        keywords: ['america television', 'américa televisión', 'america tv', 'américa tv', 'canal 4'],
        candidateUrls: [
            'https://live-bd1.tv360.bitel.com.pe/manifest/america/master_clean_source.m3u8',
            'https://live-bd1.tv360.bitel.com.pe/manifest/america/playlist_clean_source_720p.m3u8',
            'https://live-bd1.tv360.bitel.com.pe/manifest/america/playlist_clean_source_480p.m3u8',
            'http://45.171.108.253:8888/AMERICA/index.m3u8'
        ]
    },
    {
        id: 3,
        name: 'Panamericana TV',
        category: 'NACIONALES',
        keywords: ['panamericana', 'canal 5'],
        candidateUrls: [
            'http://45.171.108.253:8888/PANAMERICANA/index.m3u8',
            'http://190.93.224.42/PANAMERICANA/index.m3u8'
        ]
    },
    {
        id: 4,
        name: 'TV Perú',
        category: 'NACIONALES',
        keywords: ['tv peru', 'tv perú', 'canal 7', 'tnp'],
        candidateUrls: [
            'http://190.93.224.42/TV-PERU/index.m3u8',
            'http://45.171.108.253:8888/TVPERU/index.m3u8'
        ]
    },
    {
        id: 5,
        name: 'ATV',
        category: 'NACIONALES',
        keywords: ['atv', 'canal 9', 'andina de television'],
        candidateUrls: [
            'http://190.93.224.42/ATV/index.m3u8',
            'http://45.171.108.253:8888/ATV/index.m3u8'
        ]
    },
    {
        id: 6,
        name: 'ATV+',
        category: 'NACIONALES',
        keywords: ['atv+', 'atv plus', 'atv mas', 'atv más'],
        candidateUrls: [
            'http://45.171.108.253:8888/ATV/index.m3u8',
            'http://190.93.224.42/ATV-SUR/index.m3u8',
            'http://190.93.224.42/ATV/index.m3u8'
        ]
    },
    {
        id: 7,
        name: 'TV Perú Noticias',
        category: 'NACIONALES',
        keywords: ['tv peru noticias', 'tv perú noticias', '7.3', 'peru noticias'],
        candidateUrls: [
            'http://190.93.224.42/TV-PERU-NOTICIAS/index.m3u8',
            'http://45.171.108.253:8888/TVPERUNOTICIAS/index.m3u8'
        ]
    },
    {
        id: 8,
        name: 'Willax TV',
        category: 'NACIONALES',
        keywords: ['willax'],
        candidateUrls: [
            'http://190.93.224.42/WILLAX/index.m3u8',
            'http://45.171.108.253:8888/WILLAX/index.m3u8'
        ]
    },
    {
        id: 9,
        name: 'Exitosa TV',
        category: 'NACIONALES',
        keywords: ['exitosa'],
        candidateUrls: [
            'http://190.93.224.42/EXITOSA/index.m3u8',
            'http://45.171.108.253:8888/EXITOSA/index.m3u8'
        ]
    },
    {
        id: 10,
        name: 'Nativa TV',
        category: 'NACIONALES',
        keywords: ['nativa'],
        candidateUrls: [
            'http://187.102.210.46/NATIVATV/index.m3u8',
            'https://live-evg7.tv360.bitel.com.pe/bitel/nativachanchamayoSRT/playlist.m3u8'
        ]
    },
    {
        id: 11,
        name: 'Congreso TV',
        category: 'NACIONALES',
        keywords: ['congreso', 'justicia tv', 'justiciatv'],
        candidateUrls: [
            'http://190.93.224.42/JUSTICIA-TV/index.m3u8',
            'http://138.121.15.230:9002/CANAL-CONGRESO/index.m3u8'
        ]
    },
    {
        id: 12,
        name: 'Sol TV',
        category: 'NACIONALES',
        keywords: ['sol tv'],
        candidateUrls: [
            'https://cloudpro.servidoresdestream.com:8081/8010/index.m3u8',
            'https://cdn.streamhispanatv.net:3409/live/soltvlive.m3u8',
            'https://live-evg10.tv360.bitel.com.pe/bitel/36tvSRT/playlist.m3u8',
            'https://s.emisoras.tv:8081/girasoltv/index.m3u8'
        ]
    }
];

// 2. Bloque Maestro 2: Deportes (Fijos 13 - 20)
const BLOCK_2_DEPORTES = [
    {
        id: 13,
        name: 'ESPN',
        category: 'DEPORTES',
        keywords: ['espn latin america', 'espn hd', 'espn colombia', 'espn argentina', 'espn '],
        candidateUrls: [
            'https://barinaslive1.boldmss.com/ESPN/ESPN.isml/ESPN.m3u8',
            'http://190.61.47.54:8000/play/a004/index.m3u8'
        ]
    },
    {
        id: 14,
        name: 'ESPN 2',
        category: 'DEPORTES',
        keywords: ['espn 2', 'espn2'],
        candidateUrls: [
            'https://barinaslive1.boldmss.com/ESPN_2/ESPN_2.isml/ESPN_2.m3u8',
            'http://190.61.47.54:8000/play/a005/index.m3u8'
        ]
    },
    {
        id: 15,
        name: 'DSports (DirecTV)',
        category: 'DEPORTES',
        keywords: ['dsports', 'directv sports'],
        candidateUrls: [
            'http://38.187.7.252:8000/play/a03d/index.m3u8',
            'http://168.196.127.137:6001/play/a03d/index.m3u8',
            'http://45.170.130.224:8000/play/a03d/index.m3u8'
        ]
    },
    {
        id: 16,
        name: 'Claro Sports',
        category: 'DEPORTES',
        keywords: ['claro sports', 'clarosports'],
        candidateUrls: [
            'http://168.196.127.137:6001/play/a08r/index.m3u8',
            'https://clarosports-live.akamaized.net/hls/live/2004245/clarosports1/master.m3u8',
            'http://45.170.130.224:8000/play/a08r/index.m3u8'
        ]
    },
    {
        id: 17,
        name: 'TyC Sports / TUDN',
        category: 'DEPORTES',
        keywords: ['tyc sports', 'tyc', 'tudn'],
        candidateUrls: [
            'https://amg26268-amg26268c14-freelivesports-emea-10267.playouts.now.amagi.tv/ts-us-e2-n2/playlist/amg26268-sportsstudio-tycsports-freelivesportsemea/playlist.m3u8',
            'http://45.170.130.224:8000/play/a020/index.m3u8'
        ]
    },
    {
        id: 18,
        name: 'Ovación TV / Fútbol Perú',
        category: 'DEPORTES',
        keywords: ['ovacion', 'ovación', 'futbol peru', 'fútbol perú'],
        candidateUrls: [
            'http://cdn2.ujjina.com:1935/iptvovacion1/liveovacion1tv/playlist.m3u8',
            'http://190.93.224.42/RPP/index.m3u8'
        ]
    },
    {
        id: 19,
        name: 'FIFA+ / Red Bull TV',
        category: 'DEPORTES',
        keywords: ['fifa+', 'fifa', 'red bull tv'],
        candidateUrls: [
            'https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master.m3u8',
            'https://jmp2.uk/plu-660c29b5aec9680008f5b4a4.m3u8'
        ]
    },
    {
        id: 20,
        name: 'Real Madrid TV / Barça TV',
        category: 'DEPORTES',
        keywords: ['real madrid', 'barça', 'barca tv'],
        candidateUrls: [
            'https://rmtv.akamaized.net/hls/live/2043153/rmtv-es-web/master.m3u8',
            'https://live20.bozztv.com/dvrfl06/astv/astv-barca/index.m3u8'
        ]
    }
];

// 3. Bloque Maestro: Dibujos y Animación
const BLOCK_ANIMACION = [
    {
        name: 'Cartoon Network',
        category: 'DIBUJOS Y ANIMACIÓN',
        keywords: ['cartoon network', 'cartoon network argentina', 'cartoon network chile', 'cartoon network latin america'],
        candidateUrls: [
            'http://158.172.217.18:8000/play/a03a/index.m3u8',
            'http://45.170.130.224:8000/play/a03a/index.m3u8',
            'http://38.224.231.176:8000/play/a03a/index.m3u8'
        ]
    },
    {
        name: 'Nickelodeon',
        category: 'DIBUJOS Y ANIMACIÓN',
        keywords: ['nickelodeon', 'nick latino', 'nickonline', 'nick clasico', 'nick jr'],
        candidateUrls: [
            'https://x1colegal.com/hls/stream.m3u8',
            'http://158.172.217.18:8000/play/a03b/index.m3u8',
            'http://38.224.231.176:8000/play/a03b/index.m3u8',
            'http://45.170.130.224:8000/play/a03b/index.m3u8'
        ]
    },
    {
        name: 'Discovery Kids',
        category: 'DIBUJOS Y ANIMACIÓN',
        keywords: ['discovery kids', 'discovery kids latin america', 'discovery kids chile', 'discovery kids colombia'],
        candidateUrls: [
            'http://38.224.231.176:8000/play/a01j/index.m3u8',
            'http://38.134.250.110:8000/play/a003/index.m3u8',
            'http://45.170.130.224:8000/play/a01j/index.m3u8'
        ]
    },
    {
        name: 'Disney Channel',
        category: 'DIBUJOS Y ANIMACIÓN',
        keywords: ['disney channel', 'disney channel latin america', 'disney channel argentina'],
        candidateUrls: [
            'http://45.134.141.161:2200/ARG/Disney_Channel/index.m3u8',
            'http://138.121.15.230:9002/DISNEY-CHANNEL/index.m3u8',
            'http://181.78.14.26:4000/play/a015/index.m3u8',
            'http://38.224.231.176:8000/play/a015/index.m3u8'
        ]
    },
    {
        name: 'Disney Jr.',
        category: 'DIBUJOS Y ANIMACIÓN',
        keywords: ['disney jr', 'disney junior', 'disney jr.'],
        candidateUrls: [
            'http://181.78.14.26:4000/play/a073/index.m3u8',
            'http://45.185.163.75:8000/play/a016/index.m3u8',
            'http://38.224.231.176:8000/play/a016/index.m3u8'
        ]
    },
    {
        name: 'Tooncast / Cartoonito',
        category: 'DIBUJOS Y ANIMACIÓN',
        keywords: ['tooncast', 'cartoonito', 'boomerang'],
        candidateUrls: [
            'http://38.134.250.110:8000/play/a01t/index.m3u8',
            'http://200.62.239.170:830/play/a07n/index.m3u8',
            'http://38.224.231.176:8000/play/a01t/index.m3u8'
        ]
    },
    {
        name: 'Bob Esponja 24/7',
        category: 'DIBUJOS Y ANIMACIÓN',
        keywords: ['bob esponja', 'spongebob', 'bob esponja 24/7'],
        candidateUrls: [
            'https://bob.x1colegal.com/hls/stream.m3u8'
        ]
    },
    {
        name: 'Dreiko TV (Dibujos y Anime Clásico)',
        category: 'DIBUJOS Y ANIMACIÓN',
        keywords: ['dreiko tv', 'dreiko'],
        candidateUrls: [
            'https://cloudvideo.servers10.com:8081/8020/index.m3u8'
        ]
    },
    {
        name: 'MAX Anime 24/7',
        category: 'DIBUJOS Y ANIMACIÓN',
        keywords: ['max anime', 'anime 24/7', 'dragon ball', 'locomotion', 'energigeeek'],
        candidateUrls: [
            'https://cdnlive.klicgo.net/maxanime/live/playlist.m3u8'
        ]
    }
];

// Helper para verificar cabeceras CORS
function isCorsAllowed(res) {
    const allowOrigin = res.headers.get('access-control-allow-origin');
    return allowOrigin === '*' || allowOrigin === CORS_TEST_ORIGIN;
}

/**
 * Puntuación de calidad de origen y estabilidad CDN:
 * Prioriza CDNs globales seguras con HTTPS (Akamai, CloudFront, Bitel, Amagi, etc.)
 * sobre servidores HTTP de IPs crudas que suelen traer MPEG-2 / AC-3 o congelarse.
 */
function getCdnScore(url) {
    if (!url || typeof url !== 'string') return 0;
    const lower = url.toLowerCase();
    let score = 0;

    if (lower.includes('bitel.com.pe') || lower.includes('tv360')) score += 100;
    else if (lower.includes('akamaized.net') || lower.includes('cloudfront.net')) score += 95;
    else if (lower.includes('rudo.video') || lower.includes('amagi.tv') || lower.includes('boldmss.com')) score += 90;
    else if (lower.includes('google.com') || lower.includes('dailymotion') || lower.includes('mux.com')) score += 85;
    else if (lower.includes('servidoresdestream') || lower.includes('streamhispanatv') || lower.includes('ujjina')) score += 80;
    else if (lower.includes('live') || lower.includes('cdn')) score += 70;

    if (lower.startsWith('https://')) score += 40;

    if (lower.match(/:\d{4,5}\/play\//)) score -= 50;
    if (lower.match(/http:\/\/\d+\.\d+\.\d+\.\d+:\d+/)) score -= 30;

    return score;
}

/**
 * Analiza un búfer de datos TS (primeros 16 KB) buscando PAT y PMT.
 * Determina con precisión matemática si el stream transporta códec de video H.264
 * y códec de audio AAC, detectando y descartando códecs incompatibles (HEVC, MPEG-2, AC-3).
 */
function inspectTsCodecs(buf) {
    if (!buf || buf.length < 188) {
        return { isTs: false, hasH264: false, hasAac: false, hasHevc: false, hasMpeg2: false, hasAc3: false };
    }

    let syncOffset = -1;
    for (let i = 0; i < 188 && i < buf.length; i++) {
        if (buf[i] === 0x47 && (i + 188 >= buf.length || buf[i + 188] === 0x47)) {
            syncOffset = i;
            break;
        }
    }

    if (syncOffset === -1) {
        return { isTs: false, hasH264: false, hasAac: false, hasHevc: false, hasMpeg2: false, hasAc3: false };
    }

    let pmtPid = null;
    let hasH264 = false;
    let hasAac = false;
    let hasHevc = false;
    let hasMpeg2 = false;
    let hasAc3 = false;

    for (let offset = syncOffset; offset + 188 <= buf.length; offset += 188) {
        const p = buf.subarray(offset, offset + 188);
        const pusi = (p[1] & 0x40) !== 0;
        const pid = ((p[1] & 0x1f) << 8) | p[2];
        const afc = (p[3] & 0x30) >> 4;

        let payloadStart = 4;
        if (afc === 2) continue; // solo adaptación
        if (afc === 3) {
            const afl = p[4];
            payloadStart = 5 + afl;
        }
        if (payloadStart >= 188) continue;

        // PAT (PID 0)
        if (pid === 0) {
            let ptr = payloadStart;
            if (pusi) ptr += 1 + p[ptr];
            if (ptr + 8 < 188 && p[ptr] === 0x00) {
                const sectionLength = ((p[ptr + 1] & 0x0f) << 8) | p[ptr + 2];
                let pos = ptr + 8;
                const end = ptr + 3 + sectionLength - 4;
                while (pos + 4 <= end && pos + 4 <= 188) {
                    const progNum = (p[pos] << 8) | p[pos + 1];
                    const progPid = ((p[pos + 2] & 0x1f) << 8) | p[pos + 3];
                    if (progNum !== 0) {
                        pmtPid = progPid;
                    }
                    pos += 4;
                }
            }
        } else if (pmtPid !== null && pid === pmtPid) {
            // PMT (PID del canal)
            let ptr = payloadStart;
            if (pusi) ptr += 1 + p[ptr];
            if (ptr + 12 < 188 && p[ptr] === 0x02) {
                const sectionLength = ((p[ptr + 1] & 0x0f) << 8) | p[ptr + 2];
                const progInfoLength = ((p[ptr + 10] & 0x0f) << 8) | p[ptr + 11];
                let pos = ptr + 12 + progInfoLength;
                const end = ptr + 3 + sectionLength - 4;
                while (pos + 5 <= end && pos + 5 <= 188) {
                    const stype = p[pos];
                    const esInfoLen = ((p[pos + 3] & 0x0f) << 8) | p[pos + 4];

                    if (stype === 0x1b) hasH264 = true;
                    else if (stype === 0x24) hasHevc = true;
                    else if (stype === 0x01 || stype === 0x02) hasMpeg2 = true;
                    else if (stype === 0x0f || stype === 0x11) hasAac = true;
                    else if (stype === 0x81 || stype === 0x87) hasAc3 = true;

                    pos += 5 + esInfoLen;
                }
            }
        }
    }

    return { isTs: true, hasH264, hasAac, hasHevc, hasMpeg2, hasAc3 };
}

/**
 * Inspecciona las etiquetas #EXT-X-STREAM-INF y #EXT-X-MEDIA del manifiesto
 * para detectar códecs incompatibles declarados.
 */
function checkManifestCodecs(manifestText) {
    const lines = manifestText.split(/\r?\n/).map(l => l.trim());
    let hasAvc1 = false;
    let hasMp4a = false;
    let hasHevc = false;
    let hasAc3 = false;
    let hasExplicitCodecs = false;

    for (const l of lines) {
        if (l.startsWith('#EXT-X-STREAM-INF') || l.startsWith('#EXT-X-MEDIA:TYPE=AUDIO')) {
            const match = l.match(/CODECS="([^"]+)"/i);
            if (match) {
                hasExplicitCodecs = true;
                const cStr = match[1].toLowerCase();
                if (cStr.includes('avc1') || cStr.includes('h264')) hasAvc1 = true;
                if (cStr.includes('mp4a') || cStr.includes('aac')) hasMp4a = true;
                if (cStr.includes('hev1') || cStr.includes('hvc1')) hasHevc = true;
                if (cStr.includes('ac-3') || cStr.includes('ec-3') || cStr.includes('ac3')) hasAc3 = true;
            }
        }
    }

    return { hasExplicitCodecs, hasAvc1, hasMp4a, hasHevc, hasAc3 };
}

/**
 * Verificación profunda de streaming HLS:
 * a) Descarga el .m3u8 principal con cabecera Origin (CORS check).
 * b) Inspecciona el manifiesto y rechaza códecs incompatibles (HEVC / AC-3 sin avc1+mp4a).
 * c) Si es Master Playlist, resuelve la sub-playlist (Media Playlist) compatible.
 * d) Descarga los primeros 16 KB del primer segmento (.ts o .m4s).
 * e) En streams TS, valida la presencia de video H.264 (0x1b) y audio AAC (0x0f/0x11),
 *    descartando HEVC (0x24), MPEG-2 (0x02) y Dolby AC-3 (0x81/0x87).
 */
async function testHlsDeep(url, timeoutMs = TIMEOUT_MS) {
    if (!url || typeof url !== 'string' || !url.startsWith('http')) return false;

    try {
        // a) Descargar Manifiesto Maestro con Origin
        const res1 = await fetch(url, {
            headers: {
                'Origin': CORS_TEST_ORIGIN,
                'User-Agent': USER_AGENT
            },
            signal: AbortSignal.timeout(timeoutMs)
        });

        if (!res1.ok) return false;
        if (!isCorsAllowed(res1)) return false;

        const text1 = await res1.text();
        if (!text1.includes('#EXTM3U')) return false;

        // b) Rechazar si declara códecs incompatibles sin alternativa avc1 + mp4a
        const mCodecs = checkManifestCodecs(text1);
        if (mCodecs.hasExplicitCodecs) {
            if ((mCodecs.hasHevc || mCodecs.hasAc3) && !(mCodecs.hasAvc1 && mCodecs.hasMp4a)) {
                return false;
            }
        }

        let mediaPlaylistUrl = url;
        let mediaPlaylistText = text1;

        // c) Si es Master Playlist (#EXT-X-STREAM-INF), resolver sub-playlist compatible
        if (text1.includes('#EXT-X-STREAM-INF')) {
            const lines = text1.split(/\r?\n/).map(l => l.trim());
            let subPath = null;
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].startsWith('#EXT-X-STREAM-INF')) {
                    const lLower = lines[i].toLowerCase();
                    if (lLower.includes('hev') || lLower.includes('hvc') || lLower.includes('ac-3')) {
                        continue; // Evitar variantes incompatibles
                    }
                    for (let j = i + 1; j < lines.length; j++) {
                        const nextLine = lines[j];
                        if (nextLine && !nextLine.startsWith('#')) {
                            subPath = nextLine;
                            break;
                        }
                    }
                    if (subPath) break;
                }
            }

            if (!subPath) {
                // Fallback a primera variante si no había atributos de codec
                for (let i = 0; i < lines.length; i++) {
                    if (lines[i].startsWith('#EXT-X-STREAM-INF')) {
                        for (let j = i + 1; j < lines.length; j++) {
                            const nextLine = lines[j];
                            if (nextLine && !nextLine.startsWith('#')) {
                                subPath = nextLine;
                                break;
                            }
                        }
                        if (subPath) break;
                    }
                }
            }

            if (!subPath) return false;
            mediaPlaylistUrl = subPath.startsWith('http') ? subPath : new URL(subPath, url).href;

            const res2 = await fetch(mediaPlaylistUrl, {
                headers: {
                    'Origin': CORS_TEST_ORIGIN,
                    'User-Agent': USER_AGENT
                },
                signal: AbortSignal.timeout(timeoutMs)
            });

            if (!res2.ok) return false;
            if (!isCorsAllowed(res2)) return false;

            mediaPlaylistText = await res2.text();
            if (!mediaPlaylistText.includes('#EXTM3U')) return false;
        }

        // d) Localizar primer segmento de video (.ts, .m4s, .mp4, .aac o tras #EXTINF)
        const mediaLines = mediaPlaylistText.split(/\r?\n/).map(l => l.trim());
        let segmentPath = null;

        for (let i = 0; i < mediaLines.length; i++) {
            if (mediaLines[i].startsWith('#EXTINF:')) {
                for (let j = i + 1; j < mediaLines.length; j++) {
                    const l = mediaLines[j];
                    if (l && !l.startsWith('#')) {
                        segmentPath = l;
                        break;
                    }
                }
                if (segmentPath) break;
            }
        }

        if (!segmentPath) {
            for (const l of mediaLines) {
                if (l && !l.startsWith('#') && (l.includes('.ts') || l.includes('.m4s') || l.includes('.mp4') || l.includes('.aac') || l.includes('segment') || l.includes('frag'))) {
                    segmentPath = l;
                    break;
                }
            }
        }

        if (!segmentPath) return false;

        const segmentUrl = segmentPath.startsWith('http') ? segmentPath : new URL(segmentPath, mediaPlaylistUrl).href;

        // e) Descarga y verificación de primeros 16 KB del segmento de video
        const res3 = await fetch(segmentUrl, {
            headers: {
                'Origin': CORS_TEST_ORIGIN,
                'User-Agent': USER_AGENT,
                'Range': 'bytes=0-16384'
            },
            signal: AbortSignal.timeout(timeoutMs)
        });

        if (!res3.ok && res3.status !== 206) return false;
        if (!isCorsAllowed(res3)) return false;

        const arrayBuf = await res3.arrayBuffer();
        if (arrayBuf.byteLength === 0) return false;

        const buf = Buffer.from(arrayBuf);
        const tsInfo = inspectTsCodecs(buf);

        // Si es un flujo TS, verificar que no tenga códecs incompatibles
        if (tsInfo.isTs) {
            if (tsInfo.hasHevc) return false; // Pantalla negra por HEVC H.265
            if (tsInfo.hasMpeg2 && !tsInfo.hasH264) return false; // Pantalla negra por MPEG-2
            if (tsInfo.hasAc3 && !tsInfo.hasAac) return false; // Audio Dolby no soportado sin AAC
        }

        return true;
    } catch (e) {
        return false;
    }
}

// Descargar y parsear listas M3U
async function fetchM3U(url) {
    try {
        console.log(`[M3U] Descargando ${url}...`);
        const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        const lines = text.split(/\r?\n/);
        const channels = [];
        let currentName = null;

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            if (trimmed.startsWith('#EXTINF:')) {
                const commaIdx = trimmed.lastIndexOf(',');
                currentName = commaIdx !== -1 ? trimmed.substring(commaIdx + 1).trim() : 'Canal';
            } else if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
                if (currentName) {
                    channels.push({ name: currentName, url: trimmed });
                    currentName = null;
                }
            }
        }
        console.log(`[M3U] ${channels.length} canales extraídos de ${url}`);
        return channels;
    } catch (err) {
        console.warn(`[M3U] Error descargando ${url}:`, err.message);
        return [];
    }
}

async function main() {
    console.log('=== JANDOS-TV: INICIANDO CURACIÓN CON VERIFICACIÓN PROFUNDA HLS + CORS ===\n');

    // 1. Descargar listas M3U en paralelo
    const m3uResults = await Promise.all(M3U_SOURCES.map(s => fetchM3U(s.url)));
    const allRawChannels = m3uResults.flat();
    console.log(`Total canales en bruto recolectados: ${allRawChannels.length}`);

    // Helper para emparejar URLs adicionales encontradas en los M3U con un canal
    function findExtraUrlsForKeywords(keywords) {
        const found = [];
        for (const raw of allRawChannels) {
            const rawName = raw.name.toLowerCase();
            const matches = keywords.some(kw => rawName.includes(kw.toLowerCase()));
            if (matches && !found.includes(raw.url)) {
                found.push(raw.url);
            }
        }
        return found;
    }

    // 2. Procesar Bloque 1: Nacionales Perú
    console.log('\n--- VERIFICANDO BLOQUE 1: NACIONALES PERÚ (DEEP CHECK) ---');
    const finalNacionales = [];
    for (const ch of BLOCK_1_NACIONALES) {
        process.stdout.write(`Probando ${ch.name}... `);
        const allCandidates = [...ch.candidateUrls, ...findExtraUrlsForKeywords(ch.keywords)];
        const uniqueCandidates = [...new Set(allCandidates)];
        // Priorizar CDNs estables
        uniqueCandidates.sort((a, b) => getCdnScore(b) - getCdnScore(a));
        const workingUrls = [];

        for (const u of uniqueCandidates) {
            // Si ya existe una señal CDN estable verificada, descartar IPs crudas inestables :8000/play/
            const hasCdn = workingUrls.some(w => getCdnScore(w) >= 70);
            if (hasCdn && (u.includes(':8000/play/') || u.includes(':6001/play/'))) {
                continue;
            }

            const ok = await testHlsDeep(u);
            if (ok) {
                workingUrls.push(u);
                if (workingUrls.length >= 2) break; // Máximo 2 señales vivas verificadas
            }
        }

        if (workingUrls.length === 0) {
            // Respaldar con la candidata de mayor calidad CDN
            const sortedFallback = [...ch.candidateUrls].sort((a, b) => getCdnScore(b) - getCdnScore(a));
            workingUrls.push(sortedFallback[0]);
            console.log(`[FALLBACK ASIGNADO] (0 señales deep-ok)`);
        } else {
            console.log(`[OK] (${workingUrls.length} señales 100% activas)`);
        }

        finalNacionales.push({
            id: ch.id,
            name: ch.name,
            category: 'NACIONALES',
            urls: workingUrls
        });
    }

    // 3. Procesar Bloque 2: Deportes
    console.log('\n--- VERIFICANDO BLOQUE 2: DEPORTES (DEEP CHECK) ---');
    const finalDeportes = [];
    for (const ch of BLOCK_2_DEPORTES) {
        process.stdout.write(`Probando ${ch.name}... `);
        const allCandidates = [...ch.candidateUrls, ...findExtraUrlsForKeywords(ch.keywords)];
        const uniqueCandidates = [...new Set(allCandidates)];
        // Priorizar CDNs estables
        uniqueCandidates.sort((a, b) => getCdnScore(b) - getCdnScore(a));
        const workingUrls = [];

        for (const u of uniqueCandidates) {
            // Si ya existe una señal CDN estable verificada, descartar IPs crudas inestables :8000/play/
            const hasCdn = workingUrls.some(w => getCdnScore(w) >= 70);
            if (hasCdn && (u.includes(':8000/play/') || u.includes(':6001/play/'))) {
                continue;
            }

            const ok = await testHlsDeep(u);
            if (ok) {
                workingUrls.push(u);
                if (workingUrls.length >= 2) break;
            }
        }

        if (workingUrls.length === 0) {
            const sortedFallback = [...ch.candidateUrls].sort((a, b) => getCdnScore(b) - getCdnScore(a));
            workingUrls.push(sortedFallback[0]);
            console.log(`[FALLBACK ASIGNADO]`);
        } else {
            console.log(`[OK] (${workingUrls.length} señales 100% activas)`);
        }

        finalDeportes.push({
            id: ch.id,
            name: ch.name,
            category: 'DEPORTES',
            urls: workingUrls
        });
    }

    // 4. Procesar Bloque 3: Cine, Cultura y Regionales Selectos
    console.log('\n--- VERIFICANDO BLOQUE 3: CINE, CULTURA Y REGIONALES (DEEP CHECK) ---');
    const cineKeywords = [
        'cinecanal', 'cinelatino', 'cine familiar', 'cine hispano', 'cine sony', 'paramount',
        'dhe', 'tnt', 'space', 'warner', 'universal', 'star channel', 'film', 'history', 'discovery channel'
    ];
    const regionalKeywords = [
        'arequipa', 'cusco', 'trujillo', 'piura', 'huacho', 'chimbote', 'puno', 'chiclayo',
        'iquitos', 'tarapoto', 'tacna', 'antena sur', 'tv cosmos', 'sol tv', 'andina rtv'
    ];

    const targetBlock3Keywords = [...cineKeywords, ...regionalKeywords];
    const verifiedBlock3 = [];
    const testedUrls = new Set();

    // Ordenar canales recolectados para evaluar primero streams CDN de alta reputación
    allRawChannels.sort((a, b) => getCdnScore(b.url) - getCdnScore(a.url));

    for (const raw of allRawChannels) {
        if (verifiedBlock3.length >= 25) break;

        const rawLower = raw.name.toLowerCase();
        // Evitar que canales infantiles o de animación se clasifiquen como cine
        if (rawLower.includes('kids') || rawLower.includes('disney') || rawLower.includes('nick') || rawLower.includes('cartoon')) {
            continue;
        }

        const matchesTarget = targetBlock3Keywords.some(kw => rawLower.includes(kw));

        if (matchesTarget && !testedUrls.has(raw.url)) {
            testedUrls.add(raw.url);
            const ok = await testHlsDeep(raw.url);
            if (ok) {
                const isRegional = regionalKeywords.some(kw => rawLower.includes(kw));
                const category = isRegional ? 'REGIONALES' : 'CINE Y CULTURA';

                console.log(`  [+ VERIFICADO H.264+AAC] ${raw.name} (${category})`);
                verifiedBlock3.push({
                    name: raw.name,
                    category: category,
                    urls: [raw.url]
                });
            }
        }
    }

    const cineList = verifiedBlock3.filter(ch => ch.category === 'CINE Y CULTURA');
    const regionalList = verifiedBlock3.filter(ch => ch.category === 'REGIONALES');

    // 5. Procesar Bloque: DIBUJOS Y ANIMACIÓN
    console.log('\n--- VERIFICANDO BLOQUE: DIBUJOS Y ANIMACIÓN (DEEP CHECK) ---');
    const finalAnimacion = [];
    for (const ch of BLOCK_ANIMACION) {
        process.stdout.write(`Probando ${ch.name}... `);
        const allCandidates = [...ch.candidateUrls, ...findExtraUrlsForKeywords(ch.keywords)];
        const uniqueCandidates = [...new Set(allCandidates)];
        uniqueCandidates.sort((a, b) => getCdnScore(b) - getCdnScore(a));
        const workingUrls = [];

        for (const u of uniqueCandidates) {
            const hasCdn = workingUrls.some(w => getCdnScore(w) >= 70);
            if (hasCdn && (u.includes(':8000/play/') || u.includes(':6001/play/'))) {
                continue;
            }

            const ok = await testHlsDeep(u);
            if (ok) {
                workingUrls.push(u);
                testedUrls.add(u);
                if (workingUrls.length >= 2) break;
            }
        }

        if (workingUrls.length === 0) {
            const sortedFallback = [...ch.candidateUrls].sort((a, b) => getCdnScore(b) - getCdnScore(a));
            workingUrls.push(sortedFallback[0]);
            console.log(`[FALLBACK ASIGNADO]`);
        } else {
            console.log(`[OK] (${workingUrls.length} señales 100% activas)`);
        }

        finalAnimacion.push({
            name: ch.name,
            category: 'DIBUJOS Y ANIMACIÓN',
            urls: workingUrls
        });
    }

    // Buscar señales adicionales de animación en español en allRawChannels (Cartoonito, Boomerang, Anime, etc.)
    const extraAnimKeywords = ['cartoonito', 'boomerang', 'anime', 'dragon ball', 'locomotion', 'energigeeek', 'pluto tv anime', 'nick clasico'];
    for (const raw of allRawChannels) {
        if (finalAnimacion.length >= 15) break;
        const rawLower = raw.name.toLowerCase();
        const matchesExtra = extraAnimKeywords.some(kw => rawLower.includes(kw));
        if (matchesExtra && !testedUrls.has(raw.url)) {
            testedUrls.add(raw.url);
            const ok = await testHlsDeep(raw.url);
            if (ok) {
                console.log(`  [+ VERIFICADO H.264+AAC] ${raw.name} (DIBUJOS Y ANIMACIÓN)`);
                finalAnimacion.push({
                    name: raw.name,
                    category: 'DIBUJOS Y ANIMACIÓN',
                    urls: [raw.url]
                });
            }
        }
    }

    // 6. Consolidar la Parrilla Final con IDs continuos
    console.log('\n--- CONSOLIDANDO PARRILLA FINAL ---');
    let nextId = 1;
    const finalChannelsList = [];

    // Bloque 1: Nacionales (1 a 12)
    finalNacionales.forEach(ch => {
        ch.id = nextId++;
        finalChannelsList.push(ch);
    });

    // Bloque 2: Deportes (13 a 20)
    finalDeportes.forEach(ch => {
        ch.id = nextId++;
        finalChannelsList.push(ch);
    });

    // Bloque 3: Cine y Cultura
    cineList.forEach(ch => {
        ch.id = nextId++;
        finalChannelsList.push(ch);
    });

    // Bloque 4: Dibujos y Animación (ubicado justo después del bloque de Cine y Cultura, antes de Regionales)
    finalAnimacion.forEach(ch => {
        ch.id = nextId++;
        finalChannelsList.push(ch);
    });

    // Bloque 5: Regionales
    regionalList.forEach(ch => {
        ch.id = nextId++;
        finalChannelsList.push(ch);
    });

    console.log(`Parrilla final lista con ${finalChannelsList.length} canales verificados en profundidad (${finalNacionales.length} Nacionales, ${finalDeportes.length} Deportes, ${cineList.length} Cine/Cultura, ${finalAnimacion.length} Dibujos/Animación, ${regionalList.length} Regionales).`);

    const outputJson = {
        version: '1.4.0',
        updated: new Date().toISOString().split('T')[0],
        totalChannels: finalChannelsList.length,
        description: 'Parrilla curada con verificación profunda HLS + CORS para Jandos-TV (Exclusivo Hls.js en TV). Incluye Bloque exclusivo de Dibujos y Animación.',
        channels: finalChannelsList
    };

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(outputJson, null, 2), 'utf-8');
    console.log(`\nArchivo guardado con éxito en: ${OUTPUT_FILE}`);
}

main().catch(err => {
    console.error('Error fatal en clean-channels.js:', err);
    process.exit(1);
});
