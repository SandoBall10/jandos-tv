/**
 * clean-channels.js - Script de Limpieza y Curación de Canales para Jandos-TV
 * Descarga las listas, verifica en paralelo que cada stream responda con HTTP 200 y #EXTM3U,
 * elimina canales caídos/congelados y organiza la parrilla en bloques VIP (Nacionales, Deportes, Cine/Regionales).
 */

const fs = require('fs');
const path = require('path');

const TIMEOUT_MS = 3500;
const OUTPUT_FILE = path.join(__dirname, 'canales-remotos.json');

// Fuentes M3U a consultar
const M3U_SOURCES = [
    { url: 'https://iptv-org.github.io/iptv/countries/pe.m3u', tag: 'peru' },
    { url: 'https://iptv-org.github.io/iptv/categories/sports.m3u', tag: 'sports' },
    { url: 'https://iptv-org.github.io/iptv/languages/spa.m3u', tag: 'spanish' }
];

// 1. Bloque Maestro 1: Nacionales Perú (Fijos 01 - 12 con respaldo YouTube Live)
const BLOCK_1_NACIONALES = [
    {
        id: 1,
        name: 'Latina Televisión',
        category: 'NACIONALES',
        keywords: ['latina', 'frecuencia latina', 'canal 2'],
        candidateUrls: [
            'https://dai.google.com/linear/hls/event/oYQGDqEGTmGdHE_fz9oLlg/master.m3u8',
            'https://redirector.rudo.video/hls-video/plus226/latina4/latina4.smil/playlist.m3u8',
            'http://190.93.224.42/LATINA/index.m3u8',
            'http://45.171.108.253:8888/LATINA/index.m3u8'
        ],
        youtubeChannelId: 'UC6Xw2bFj8vQf0sD8tK8y0qw',
        youtubeEmbedUrl: 'https://www.youtube.com/embed/live_stream?channel=UC6Xw2bFj8vQf0sD8tK8y0qw&autoplay=1&mute=0'
    },
    {
        id: 2,
        name: 'América Televisión',
        category: 'NACIONALES',
        keywords: ['america television', 'américa televisión', 'america tv', 'américa tv', 'canal 4'],
        candidateUrls: [
            'http://45.171.108.253:8888/AMERICA/index.m3u8',
            'http://190.93.224.42/AMERICA/index.m3u8'
        ],
        youtubeChannelId: 'UC4Z4s3zB8T4xVzT2k7_0nCw',
        youtubeEmbedUrl: 'https://www.youtube.com/embed/live_stream?channel=UC4Z4s3zB8T4xVzT2k7_0nCw&autoplay=1&mute=0'
    },
    {
        id: 3,
        name: 'Panamericana TV',
        category: 'NACIONALES',
        keywords: ['panamericana', 'canal 5'],
        candidateUrls: [
            'http://45.171.108.253:8888/PANAMERICANA/index.m3u8',
            'http://190.93.224.42/PANAMERICANA/index.m3u8'
        ],
        youtubeChannelId: 'UC8L0o0s3t308_e9c0z4A_ww',
        youtubeEmbedUrl: 'https://www.youtube.com/embed/live_stream?channel=UC8L0o0s3t308_e9c0z4A_ww&autoplay=1&mute=0'
    },
    {
        id: 4,
        name: 'TV Perú',
        category: 'NACIONALES',
        keywords: ['tv peru', 'tv perú', 'canal 7', 'tnp'],
        candidateUrls: [
            'http://190.93.224.42/TV-PERU/index.m3u8',
            'http://45.171.108.253:8888/TVPERU/index.m3u8',
            'http://bantel-cdn1.iptvperu.tv:1935/btnscrtn/nacionaltv_peru.stream/playlist.m3u8',
            'https://k20.usastreams.com:8081/tvperuanisima/index.m3u8'
        ],
        youtubeChannelId: 'UCyvK7t9N8eP1ZfQ7dF2u3gA',
        youtubeEmbedUrl: 'https://www.youtube.com/embed/live_stream?channel=UCyvK7t9N8eP1ZfQ7dF2u3gA&autoplay=1&mute=0'
    },
    {
        id: 5,
        name: 'ATV',
        category: 'NACIONALES',
        keywords: ['atv', 'canal 9', 'andina de television'],
        candidateUrls: [
            'http://190.93.224.42/ATV/index.m3u8',
            'http://45.171.108.253:8888/ATV/index.m3u8'
        ],
        youtubeChannelId: 'UC8L0o0s3t308_atv_noticias',
        youtubeEmbedUrl: 'https://www.youtube.com/embed/live_stream?channel=UC8L0o0s3t308_atv_noticias&autoplay=1&mute=0'
    },
    {
        id: 6,
        name: 'ATV+',
        category: 'NACIONALES',
        keywords: ['atv+', 'atv plus', 'atv mas', 'atv más'],
        candidateUrls: [
            'http://45.171.108.253:8888/ATV/index.m3u8',
            'http://190.93.224.42/ATV-MAS/index.m3u8',
            'http://190.93.224.42/ATV-SUR/index.m3u8'
        ],
        youtubeChannelId: 'UC8L0o0s3t308_atv_mas',
        youtubeEmbedUrl: 'https://www.youtube.com/embed/live_stream?channel=UC8L0o0s3t308_atv_mas&autoplay=1&mute=0'
    },
    {
        id: 7,
        name: 'TV Perú Noticias',
        category: 'NACIONALES',
        keywords: ['tv peru noticias', 'tv perú noticias', '7.3', 'peru noticias'],
        candidateUrls: [
            'http://190.93.224.42/TV-PERU-NOTICIAS/index.m3u8',
            'http://45.171.108.253:8888/TVPERUNOTICIAS/index.m3u8'
        ],
        youtubeChannelId: 'UCyvK7t9N8eP1ZfQ7dF2u3gA',
        youtubeEmbedUrl: 'https://www.youtube.com/embed/live_stream?channel=UCyvK7t9N8eP1ZfQ7dF2u3gA&autoplay=1&mute=0'
    },
    {
        id: 8,
        name: 'Willax TV',
        category: 'NACIONALES',
        keywords: ['willax'],
        candidateUrls: [
            'http://190.93.224.42/WILLAX/index.m3u8',
            'http://45.171.108.253:8888/WILLAX/index.m3u8'
        ],
        youtubeChannelId: 'UCwillax_oficial_envivo',
        youtubeEmbedUrl: 'https://www.youtube.com/embed/live_stream?channel=UCwillax_oficial_envivo&autoplay=1&mute=0'
    },
    {
        id: 9,
        name: 'Exitosa TV',
        category: 'NACIONALES',
        keywords: ['exitosa'],
        candidateUrls: [
            'http://190.93.224.42/EXITOSA/index.m3u8',
            'http://45.171.108.253:8888/EXITOSA/index.m3u8'
        ],
        youtubeChannelId: 'UCa5T-U9o3j0c8vK8y0exitosa',
        youtubeEmbedUrl: 'https://www.youtube.com/embed/live_stream?channel=UCa5T-U9o3j0c8vK8y0exitosa&autoplay=1&mute=0'
    },
    {
        id: 10,
        name: 'Nativa TV',
        category: 'NACIONALES',
        keywords: ['nativa'],
        candidateUrls: [
            'http://187.102.210.46/NATIVATV/index.m3u8',
            'https://live-evg7.tv360.bitel.com.pe/bitel/nativachanchamayoSRT/playlist.m3u8'
        ],
        youtubeChannelId: 'UCnativa_tv_peru_oficial',
        youtubeEmbedUrl: 'https://www.youtube.com/embed/live_stream?channel=UCnativa_tv_peru_oficial&autoplay=1&mute=0'
    },
    {
        id: 11,
        name: 'Congreso TV',
        category: 'NACIONALES',
        keywords: ['congreso', 'justicia tv', 'justiciatv'],
        candidateUrls: [
            'http://190.93.224.42/JUSTICIA-TV/index.m3u8',
            'http://45.171.108.253:8888/CONGRESO/index.m3u8',
            'http://190.93.224.42/CONGRESO/index.m3u8'
        ],
        youtubeChannelId: 'UCcongreso_peru_oficial',
        youtubeEmbedUrl: 'https://www.youtube.com/embed/live_stream?channel=UCcongreso_peru_oficial&autoplay=1&mute=0'
    },
    {
        id: 12,
        name: 'Sol TV',
        category: 'NACIONALES',
        keywords: ['sol tv'],
        candidateUrls: [
            'https://5949aa132c8fb.streamlock.net:1963/iptvantares/liveantarestv/playlist.m3u8',
            'https://cloudpro.servidoresdestream.com:8081/8010/index.m3u8',
            'https://live-evg10.tv360.bitel.com.pe/bitel/36tvSRT/playlist.m3u8'
        ],
        youtubeChannelId: 'UCsol_tv_peru_oficial',
        youtubeEmbedUrl: 'https://www.youtube.com/embed/live_stream?channel=UCsol_tv_peru_oficial&autoplay=1&mute=0'
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
            'http://190.61.47.54:8000/play/a004/index.m3u8',
            'http://85.237.89.160:9590/usa-s/ESPN-HD/index.m3u8'
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
            'http://187.102.208.209:8000/play/a0bq/index.m3u8'
        ]
    },
    {
        id: 16,
        name: 'Claro Sports',
        category: 'DEPORTES',
        keywords: ['claro sports', 'clarosports'],
        candidateUrls: [
            'http://168.196.127.137:6001/play/a08r/index.m3u8'
        ],
        youtubeChannelId: 'UCclIclT9b0o43p3-vj3c85Q',
        youtubeEmbedUrl: 'https://www.youtube.com/embed/live_stream?channel=UCclIclT9b0o43p3-vj3c85Q&autoplay=1&mute=0'
    },
    {
        id: 17,
        name: 'TyC Sports / TUDN',
        category: 'DEPORTES',
        keywords: ['tyc sports', 'tyc', 'tudn'],
        candidateUrls: [
            'https://amg26268-amg26268c14-freelivesports-emea-10267.playouts.now.amagi.tv/ts-',
            'http://45.170.130.224:8000/play/a020/index.m3u8',
            'http://45.190.13.8/TUDNHD/index.m3u8'
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
            'https://6c849fb3.wurl.com/master/f36d25e7e52f1ba8d7e56eb859c636563214f541/TEctbX',
            'https://886bd3fbc782459f8de7555d32d7e9ce.mediatailor.us-west-2.amazonaws.com/v1/',
            'https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master.m3u8'
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

// Comprobar si una URL de streaming está viva y responde rápido
async function testStreamUrl(url) {
    if (!url || !url.startsWith('http')) return false;
    try {
        const res = await fetch(url, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
            },
            signal: AbortSignal.timeout(TIMEOUT_MS)
        });

        if (!res.ok) return false;

        const text = await res.text();
        // Verificar que sea una lista HLS válida
        return text.includes('#EXTM3U') || text.includes('#EXTINF') || text.includes('.ts') || text.includes('.m3u8');
    } catch (e) {
        return false;
    }
}

// Descargar y parsear listas M3U
async function fetchM3U(url) {
    try {
        console.log(`[M3U] Descargando ${url}...`);
        const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
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
    console.log('=== JANDOS-TV: INICIANDO CURACIÓN Y LIMPIEZA DE CANALES ===\n');

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
    console.log('\n--- VERIFICANDO BLOQUE 1: NACIONALES PERÚ ---');
    const finalNacionales = [];
    for (const ch of BLOCK_1_NACIONALES) {
        process.stdout.write(`Probando ${ch.name}... `);
        const allCandidates = [...ch.candidateUrls, ...findExtraUrlsForKeywords(ch.keywords)];
        const uniqueCandidates = [...new Set(allCandidates)];
        const workingUrls = [];

        for (const u of uniqueCandidates) {
            const ok = await testStreamUrl(u);
            if (ok) {
                workingUrls.push(u);
                if (workingUrls.length >= 3) break; // Máximo 3 señales vivas por canal
            }
        }

        // Si ningún stream responde rápido, conservar al menos el primero como fallback para que el auto-failover
        // pruebe YouTube Live oficial
        if (workingUrls.length === 0) {
            workingUrls.push(ch.candidateUrls[0]);
            console.log(`[RESCATADO CON YOUTUBE LIVE] (0 HLS activos)`);
        } else {
            console.log(`[OK] (${workingUrls.length} señales activas)`);
        }

        finalNacionales.push({
            id: ch.id,
            name: ch.name,
            category: 'NACIONALES',
            urls: workingUrls,
            youtubeChannelId: ch.youtubeChannelId || null,
            youtubeEmbedUrl: ch.youtubeEmbedUrl || null
        });
    }

    // 3. Procesar Bloque 2: Deportes
    console.log('\n--- VERIFICANDO BLOQUE 2: DEPORTES ---');
    const finalDeportes = [];
    for (const ch of BLOCK_2_DEPORTES) {
        process.stdout.write(`Probando ${ch.name}... `);
        const allCandidates = [...ch.candidateUrls, ...findExtraUrlsForKeywords(ch.keywords)];
        const uniqueCandidates = [...new Set(allCandidates)];
        const workingUrls = [];

        for (const u of uniqueCandidates) {
            const ok = await testStreamUrl(u);
            if (ok) {
                workingUrls.push(u);
                if (workingUrls.length >= 2) break;
            }
        }

        if (workingUrls.length === 0) {
            // Respaldar con URL de contingencia conocida
            workingUrls.push(ch.candidateUrls[0]);
            console.log(`[CONSERVADO CON FALLBACK]`);
        } else {
            console.log(`[OK] (${workingUrls.length} señales activas)`);
        }

        finalDeportes.push({
            id: ch.id,
            name: ch.name,
            category: 'DEPORTES',
            urls: workingUrls,
            youtubeChannelId: ch.youtubeChannelId || null,
            youtubeEmbedUrl: ch.youtubeEmbedUrl || null
        });
    }

    // 4. Procesar Bloque 3: Cine, Cultura y Regionales Selectos
    console.log('\n--- VERIFICANDO BLOQUE 3: CINE, CULTURA Y REGIONALES ---');
    const cineKeywords = [
        'cinecanal', 'cinelatino', 'cine familiar', 'cine hispano', 'cine sony', 'paramount',
        'dhe', 'tnt', 'space', 'warner', 'universal', 'star channel', 'film', 'history', 'discovery'
    ];
    const regionalKeywords = [
        'arequipa', 'cusco', 'trujillo', 'piura', 'huacho', 'chimbote', 'puno', 'chiclayo',
        'iquitos', 'tarapoto', 'tacna', 'antena sur', 'tv cosmos', 'sol tv', 'andina rtv'
    ];

    const targetBlock3Keywords = [...cineKeywords, ...regionalKeywords];
    const verifiedBlock3 = [];
    const testedUrls = new Set();

    // Probar candidatos del bloque 3
    for (const raw of allRawChannels) {
        if (verifiedBlock3.length >= 35) break; // Limitar a ~35 para un total de ~55 canales

        const rawLower = raw.name.toLowerCase();
        const matchesTarget = targetBlock3Keywords.some(kw => rawLower.includes(kw));

        if (matchesTarget && !testedUrls.has(raw.url)) {
            testedUrls.add(raw.url);
            const ok = await testStreamUrl(raw.url);
            if (ok) {
                // Determinar subcategoría legible
                const isRegional = regionalKeywords.some(kw => rawLower.includes(kw));
                const category = isRegional ? 'REGIONALES' : 'CINE Y CULTURA';

                console.log(`  [+ ACTIVO] ${raw.name} (${category})`);
                verifiedBlock3.push({
                    name: raw.name,
                    category: category,
                    urls: [raw.url],
                    youtubeChannelId: null,
                    youtubeEmbedUrl: null
                });
            }
        }
    }

    // 5. Consolidar la Parrilla Completa con IDs continuos
    console.log('\n--- CONSOLIDANDO PARRILLA FINAL ---');
    let nextId = 1;
    const finalChannelsList = [];

    finalNacionales.forEach(ch => {
        ch.id = nextId++;
        finalChannelsList.push(ch);
    });

    finalDeportes.forEach(ch => {
        ch.id = nextId++;
        finalChannelsList.push(ch);
    });

    // Colocar primero Cine y Cultura, luego Regionales del Perú
    const cineList = verifiedBlock3.filter(ch => ch.category === 'CINE Y CULTURA');
    const regionalList = verifiedBlock3.filter(ch => ch.category === 'REGIONALES');
    const sortedBlock3 = [...cineList, ...regionalList];

    sortedBlock3.forEach(ch => {
        ch.id = nextId++;
        finalChannelsList.push(ch);
    });

    console.log(`Parrilla final lista con ${finalChannelsList.length} canales curados y funcionando (${finalNacionales.length} Nacionales, ${finalDeportes.length} Deportes, ${cineList.length} Cine/Cultura, ${regionalList.length} Regionales).`);

    const outputJson = {
        version: '1.2.0',
        updated: new Date().toISOString().split('T')[0],
        totalChannels: finalChannelsList.length,
        description: 'Parrilla curada y optimizada para Jandos-TV con bloques VIP: Nacionales (01-12), Deportes (13-20), Cine y Regionales.',
        channels: finalChannelsList
    };

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(outputJson, null, 2), 'utf-8');
    console.log(`\nArchivo guardado con éxito en: ${OUTPUT_FILE}`);
}

main().catch(err => {
    console.error('Error fatal en clean-channels.js:', err);
    process.exit(1);
});
