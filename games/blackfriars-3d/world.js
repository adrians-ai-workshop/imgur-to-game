// ============================================================================
// BLACKFRIARS REACH — 3D London Architectural & Vacation Memory World Builder
// ============================================================================

window.BlackfriarsWorld = (function () {
  // 12 Landmarks: 5 Personal Vacation Memories + 7 Iconic Blackfriars Architectural Wonders
  const LANDMARKS = [
    {
      id: "premier-inn",
      key: "1",
      isVacation: true,
      badge: "VACATION MEMORY #1 • YOUR HOTEL BASE",
      shortName: "★ Premier Inn",
      title: "Premier Inn London Blackfriars (Fleet Street)",
      year: "1–2 Dorset Rise, EC4Y 8EN • Just Off New Bridge Street",
      desc: "Your home base in Blackfriars! Tucked quietly on Dorset Rise just steps from New Bridge Street and the Thames, with its unmistakable royal-purple crescent moon sign, warm lobby, Thyme breakfast bar, and famous Hypnos beds after long days exploring London. Step inside the front doors to explore the lobby, Thyme breakfast room, and Room 312!",
      sound: "hotel",
      pos: { x: -36, y: 6.0, z: -301 },
      lookAt: { x: -56, y: 11, z: -301 },
      plaquePos: { x: -43.5, y: 7.2, z: -295.5 }
    },
    {
      id: "tesco-express",
      key: "2",
      isVacation: true,
      badge: "VACATION MEMORY #2 • DAILY ESSENTIALS",
      shortName: "★ Tesco Express",
      title: "Tesco Express (20–21 New Bridge Street)",
      year: "Corner of Dorset Rise & New Bridge Street • EC4V 6DB",
      desc: "Right at the end of Dorset Rise as you step onto New Bridge Street! An essential stop on your Blackfriars trip for grabbing a classic £3.90 Meal Deal (sandwich, Kettle Chips, and a cold drink), snacks for the hotel room, and hearing the familiar chorus of the self-checkout kiosks. Walk right inside to browse the chilled aisles!",
      sound: "checkout",
      pos: { x: -9.5, y: 6.0, z: -280 },
      lookAt: { x: -24, y: 9.5, z: -280 },
      plaquePos: { x: -14.2, y: 7.2, z: -274.5 }
    },
    {
      id: "sainsburys-local",
      key: "3",
      isVacation: true,
      badge: "VACATION MEMORY #3 • BAKERY & TREATS",
      shortName: "★ Sainsbury's",
      title: "Sainsbury's Local (26–27 New Bridge Street)",
      year: "New Bridge Street West Pavement • EC4V 6BJ",
      desc: "Just steps up New Bridge Street from Dorset Rise and Tesco, glowing with its warm orange-and-plum fascia. Nothing beats ducking into Sainsbury's Local in the morning for warm butter croissants from the in-store bakery or picking up evening treats on the walk back to the Premier Inn. Step inside to visit the bakery counter!",
      sound: "checkout",
      pos: { x: -9.5, y: 6.0, z: -322 },
      lookAt: { x: -24, y: 9.5, z: -322 },
      plaquePos: { x: -14.2, y: 7.2, z: -316.5 }
    },
    {
      id: "black-friar",
      key: "4",
      isVacation: true,
      badge: "VACATION MEMORY #4 • THE LEGENDARY PUB",
      shortName: "★ Black Friar Pub",
      title: "The Black Friar Public House (174 Queen Victoria St)",
      year: "1875 / Remodelled 1905 • H. Fuller Clark & Henry Poole",
      desc: "Built on the site of the 1279 medieval Dominican Priory that gave Blackfriars its name. This world-famous wedge-shaped Arts & Crafts and Art Nouveau masterpiece is crowned by a golden statue of a jovial Black Friar above the corner doors. Step inside the Grade II* barrel-vaulted marble & mother-of-pearl saloon to admire the copper friar reliefs and raise a pint!",
      sound: "pub",
      pos: { x: 26, y: 6.0, z: -224 },
      lookAt: { x: 46, y: 11, z: -228 },
      plaquePos: { x: 35.5, y: 7.2, z: -221.5 }
    },
    {
      id: "alley-restaurant",
      key: "5",
      isVacation: true,
      badge: "VACATION MEMORY #5 • SECRET ALLEY DINNER",
      shortName: "★ Alley Bistro",
      title: "The Little Restaurant in the Alley Behind The Black Friar",
      year: "Blackfriars Lane & Playhouse Yard • Historic Priory Alley",
      desc: "Tucked down the cobbled medieval lane of Blackfriars Lane & Playhouse Yard directly behind The Black Friar pub! Beneath historic brick arches and strings of warm golden fairy lights sits this intimate candlelit trattoria & bistro. Walk under the burgundy awning or step inside to your reserved corner table to relive a magical London evening.",
      sound: "bistro",
      pos: { x: 56, y: 6.0, z: -243 },
      lookAt: { x: 51, y: 8.5, z: -260 },
      plaquePos: { x: 55.2, y: 7.2, z: -249.5 }
    },
    {
      id: "road-bridge",
      key: "6",
      isVacation: false,
      badge: "CITY OF LONDON HERITAGE PLAQUE",
      shortName: "Blackfriars Bridge",
      title: "Blackfriars Road Bridge",
      year: "Opened 1869 • Designed by Joseph Cubitt & H. Carr",
      desc: "A Grade II listed five-arch wrought-iron bridge spanning the River Thames. Opened by Queen Victoria, its piers feature Gothic Revival Portland stone columns crowned with carvings of waterfowl by sculptor John Birnie Philip, topped by semi-circular observation pulpits.",
      sound: "chime",
      pos: { x: -11, y: 8.6, z: 0 },
      lookAt: { x: 25, y: 12, z: -20 },
      plaquePos: { x: -13.2, y: 9.8, z: 0 }
    },
    {
      id: "underground-station",
      key: "7",
      isVacation: false,
      badge: "LONDON UNDERGROUND HERITAGE",
      shortName: "Underground Stn",
      title: "Blackfriars Underground Station (Circle & District Lines)",
      year: "Opened 1870 • Metropolitan District Railway / 2012 Entrance Hall",
      desc: "Serving the Circle and District lines beneath Queen Victoria Street and New Bridge Street. Originally opened in May 1870, the subsurface cut-and-cover station connects via Oyster ticket gates and escalators to the North Bank entrance hall and Thameslink platforms.",
      sound: "chime",
      pos: { x: 10, y: 6.0, z: -124 },
      lookAt: { x: 32, y: 7.5, z: -124 },
      plaquePos: { x: 15.5, y: 7.2, z: -120 }
    },
    {
      id: "solar-bridge",
      key: "8",
      isVacation: false,
      badge: "ENGINEERING LANDMARK",
      shortName: "Solar Rail Stn",
      title: "Blackfriars Railway Bridge & Solar Roof",
      year: "1886 Piers / 2012 Thameslink Reconstruction",
      desc: "The first railway station since 1864 to span the entire width of the River Thames. Its 240-metre roof is clad in over 4,400 photovoltaic solar panels, generating up to 50% of the station's energy while offering glazed panoramic river views.",
      sound: "chime",
      pos: { x: 28, y: 7.4, z: -88 },
      lookAt: { x: 35, y: 14, z: 0 },
      plaquePos: { x: 25, y: 8.6, z: -90 }
    },
    {
      id: "old-pier",
      key: "9",
      isVacation: false,
      badge: "VICTORIAN RAILWAY RELIC",
      shortName: "1864 Columns",
      title: "1864 LCDR Railway Bridge Columns & St Paul's Vista",
      year: "1864 • Joseph Cubitt (London, Chatham & Dover Rly)",
      desc: "Standing between the road bridge and the modern solar station, these four rows of ornate cast-iron columns paired on rusticated stone river piers are the surviving substructure of the original 1864 railway bridge, framing a commanding vista toward St Paul's Cathedral.",
      sound: "chime",
      pos: { x: 3.2, y: 8.1, z: -48 },
      lookAt: { x: 22, y: 9.5, z: -48 },
      plaquePos: { x: 3.3, y: 9.1, z: -48 }
    },
    {
      id: "unilever-house",
      key: "0",
      isVacation: false,
      badge: "ART DECO ARCHITECTURE",
      shortName: "Unilever & Pier",
      title: "Unilever House & Blackfriars Millennium Pier",
      year: "1930–1932 • J. Lomax-Simpson & Burnet, Tait and Lorne",
      desc: "Dominating the northern bridgehead with a sweeping Neoclassical and Art Deco curved Portland stone facade and giant Ionic colonnade on the former site of Tudor Bridewell Palace, overlooking Blackfriars Millennium Pier on the Victoria Embankment.",
      sound: "chime",
      pos: { x: -28, y: 6.0, z: -120 },
      lookAt: { x: -62, y: 22, z: -142 },
      plaquePos: { x: -34, y: 7.2, z: -126 }
    },
    {
      id: "one-blackfriars",
      key: "-",
      isVacation: false,
      badge: "CONTEMPORARY SKYLINE",
      shortName: "One Blackfriars",
      title: "One Blackfriars ('The Vase') & Doggett's Coat and Badge",
      year: "2018 • Designed by SimpsonHaugh and Partners",
      desc: "Rising 170 metres (50 storeys) above the South Bank approach alongside Doggett's Coat & Badge pub, this double-skin crystalline glass skyscraper was inspired by Timo Sarpaneva's 1956 Lansetti II glass vase.",
      sound: "chime",
      pos: { x: -16, y: 6.0, z: 122 },
      lookAt: { x: -50, y: 55, z: 148 },
      plaquePos: { x: -26, y: 7.2, z: 128 }
    },
    {
      id: "southbank-walk",
      key: "=",
      isVacation: false,
      badge: "SOUTH BANK PROMENADE",
      shortName: "South Bank & Tate",
      title: "South Bank Queen's Walk, Oxo Tower & Tate Modern",
      year: "1929 (Oxo Tower) / 1947 & 2000 (Bankside Tate Modern)",
      desc: "The tree-lined South Bank promenade connects Blackfriars across the river to Giles Gilbert Scott's monumental brick Bankside Power Station (now Tate Modern), the Millennium Footbridge, and the Art Deco Oxo Tower Wharf.",
      sound: "chime",
      pos: { x: -38, y: 6.0, z: 98 },
      lookAt: { x: -140, y: 22, z: 60 },
      plaquePos: { x: -45, y: 7.2, z: 96 }
    }
  ];

  // ==========================================================================
  // HIGH-DETAIL PROCEDURAL LONDON ARCHITECTURAL & SIGNAGE TEXTURES
  // ==========================================================================
  function makeBrickFacadeTexture(baseHex, winHex, litChance, cols, rows) {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 512;
    const ctx = c.getContext("2d");
    ctx.fillStyle = baseHex;
    ctx.fillRect(0, 0, 512, 512);

    // Subtle stone/brick masonry courses & cornice bands
    for (let y = 0; y < 512; y += 16) {
      ctx.fillStyle = y % 64 === 0 ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.13)";
      ctx.fillRect(0, y, 512, y % 64 === 0 ? 4 : 2);
    }
    ctx.fillStyle = "rgba(0,0,0,0.06)";
    for (let x = 0; x < 512; x += 32) {
      ctx.fillRect(x, 0, 1, 512);
    }

    const cw = 512 / cols;
    const ch = 512 / rows;
    for (let r = 0; r < rows; r++) {
      for (let col = 0; col < cols; col++) {
        const isLit = Math.random() < litChance;
        const padX = cw * 0.21;
        const padY = ch * 0.19;
        const wx = col * cw + padX;
        const wy = r * ch + padY;
        const ww = cw - padX * 2;
        const wh = ch - padY * 2;

        // Portland stone window lintel & sill
        ctx.fillStyle = "rgba(235, 228, 212, 0.55)";
        ctx.fillRect(wx - 3, wy - 4, ww + 6, 4);
        ctx.fillRect(wx - 4, wy + wh, ww + 8, 4);

        // Window glass with warm interior gradient if lit
        if (isLit) {
          const grad = ctx.createLinearGradient(wx, wy, wx, wy + wh);
          grad.addColorStop(0, "#ffd27d");
          grad.addColorStop(0.55, "#ffe9b3");
          grad.addColorStop(1, "#e09f45");
          ctx.fillStyle = grad;
        } else {
          ctx.fillStyle = winHex;
        }
        ctx.fillRect(wx, wy, ww, wh);

        // Window Georgian sash mullions
        ctx.fillStyle = "rgba(18, 24, 34, 0.65)";
        ctx.fillRect(wx + ww * 0.48, wy, 2, wh);
        ctx.fillRect(wx, wy + wh * 0.48, ww, 2);
      }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }

  function makeYorkstoneTexture() {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 512;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#8d867c";
    ctx.fillRect(0, 0, 512, 512);

    const tones = ["#948d83", "#867f75", "#9c9488", "#7f7970", "#8e887e"];
    let idx = 0;
    for (let y = 0; y < 512; y += 64) {
      const offset = (y / 64) % 2 === 0 ? 0 : 48;
      for (let x = -64; x < 512; x += 96) {
        ctx.fillStyle = tones[idx++ % tones.length];
        ctx.fillRect(x + offset + 2, y + 2, 92, 60);
        ctx.strokeStyle = "rgba(35,32,28,0.45)";
        ctx.lineWidth = 2;
        ctx.strokeRect(x + offset + 2, y + 2, 92, 60);
      }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(36, 36);
    return tex;
  }

  function makeCobblestoneTexture() {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 512;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#2d2a27";
    ctx.fillRect(0, 0, 512, 512);

    const stoneColors = ["#5c5751", "#6b635b", "#4e4a45", "#766c61", "#57524c", "#635c54"];
    let sIdx = 0;
    for (let y = 0; y < 512; y += 24) {
      const rowShift = (y / 24) % 2 === 0 ? 0 : 18;
      for (let x = -36; x < 512; x += 36) {
        ctx.fillStyle = stoneColors[sIdx++ % stoneColors.length];
        ctx.beginPath();
        ctx.roundRect(x + rowShift + 2, y + 2, 31, 19, 4);
        ctx.fill();
        ctx.fillStyle = "rgba(255,245,225,0.08)";
        ctx.fillRect(x + rowShift + 4, y + 3, 26, 4);
      }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(6, 12);
    return tex;
  }

  function makePremierInnSignTexture() {
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = 256;
    const ctx = c.getContext("2d");

    // Iconic Premier Inn Royal Purple background
    const grad = ctx.createLinearGradient(0, 0, 1024, 256);
    grad.addColorStop(0, "#3b1245");
    grad.addColorStop(0.5, "#521b61");
    grad.addColorStop(1, "#381042");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 256);

    // Subtle gold top & bottom trim
    ctx.fillStyle = "#f4c45a";
    ctx.fillRect(0, 0, 1024, 8);
    ctx.fillRect(0, 248, 1024, 8);

    // Golden Crescent Moon & Stars Logo on the left
    ctx.save();
    ctx.translate(125, 128);
    ctx.fillStyle = "#f7c95f";
    ctx.beginPath();
    ctx.arc(0, 0, 68, 0.35 * Math.PI, 1.65 * Math.PI, false);
    ctx.arc(-18, 0, 54, 1.55 * Math.PI, 0.45 * Math.PI, true);
    ctx.closePath();
    ctx.fill();
    // Little stars
    [[26, -34, 9], [44, -6, 6], [22, 22, 7]].forEach(([sx, sy, sr]) => {
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();

    // Crisp White "Premier Inn" Typography
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 76px Georgia, 'Times New Roman', serif";
    ctx.fillText("Premier Inn", 230, 118);

    ctx.fillStyle = "#f6d58e";
    ctx.font = "bold 28px 'Segoe UI', Arial, sans-serif";
    ctx.fillText("LONDON BLACKFRIARS (FLEET STREET) • DORSET RISE", 234, 172);

    ctx.fillStyle = "#e2c8ed";
    ctx.font = "600 21px 'Segoe UI', Arial, sans-serif";
    ctx.fillText("RECEPTION • THYME BAR & GRILL • GOOD NIGHT GUARANTEE", 234, 214);

    return new THREE.CanvasTexture(c);
  }

  function makeTescoSignTexture() {
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = 256;
    const ctx = c.getContext("2d");

    // Crisp white Tesco fascia background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 1024, 256);

    // Top & bottom Tesco blue accent bars
    ctx.fillStyle = "#00539f";
    ctx.fillRect(0, 0, 1024, 14);
    ctx.fillRect(0, 238, 1024, 18);

    // Bold Blue "TESCO" lettering
    ctx.fillStyle = "#00539f";
    ctx.font = "900 104px 'Segoe UI', Arial, sans-serif";
    ctx.fillText("TESCO", 48, 134);

    // Iconic Red Dashed Chevron Stripes under TESCO
    ctx.fillStyle = "#ee1c25";
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      const bx = 52 + i * 74;
      ctx.moveTo(bx, 154);
      ctx.lineTo(bx + 54, 154);
      ctx.lineTo(bx + 42, 172);
      ctx.lineTo(bx - 12, 172);
      ctx.closePath();
      ctx.fill();
    }

    // Light-blue "express" pill badge
    ctx.fillStyle = "#0072ce";
    ctx.beginPath();
    ctx.roundRect(455, 52, 260, 96, 18);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "italic bold 60px 'Segoe UI', Arial, sans-serif";
    ctx.fillText("express", 482, 118);

    // Right side Meal Deal & Clubcard badge
    ctx.fillStyle = "#ffd700";
    ctx.beginPath();
    ctx.roundRect(745, 38, 245, 176, 14);
    ctx.fill();
    ctx.fillStyle = "#00539f";
    ctx.font = "900 27px 'Segoe UI', Arial, sans-serif";
    ctx.fillText("CLUBCARD", 792, 82);
    ctx.fillStyle = "#111827";
    ctx.font = "bold 32px 'Segoe UI', Arial, sans-serif";
    ctx.fillText("MEAL DEAL", 776, 126);
    ctx.fillStyle = "#ee1c25";
    ctx.font = "900 42px 'Segoe UI', Arial, sans-serif";
    ctx.fillText("£3.90", 812, 178);

    ctx.fillStyle = "#334155";
    ctx.font = "bold 24px 'Segoe UI', Arial, sans-serif";
    ctx.fillText("20–21 New Bridge Street • Every little helps • Open 6am–11pm", 52, 218);

    return new THREE.CanvasTexture(c);
  }

  function makeSainsburysSignTexture() {
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = 256;
    const ctx = c.getContext("2d");

    // Authentic Sainsbury's Local rich plum/burgundy & glowing orange fascia
    ctx.fillStyle = "#3d1126";
    ctx.fillRect(0, 0, 1024, 256);

    // Prominent Sainsbury's Orange top & left brand block
    ctx.fillStyle = "#f06c00";
    ctx.fillRect(0, 0, 1024, 18);
    ctx.fillRect(36, 36, 540, 134);

    // Crisp white "Sainsbury's" inside orange block
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 84px Georgia, 'Times New Roman', serif";
    ctx.fillText("Sainsbury's", 64, 128);

    // "Local" in warm cream/orange beside it
    ctx.fillStyle = "#ff9f43";
    ctx.font = "bold 78px 'Segoe UI', Arial, sans-serif";
    ctx.fillText("Local", 605, 128);

    // Nectar badge on right
    ctx.fillStyle = "#8c1d82";
    ctx.beginPath();
    ctx.roundRect(835, 48, 155, 110, 16);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 30px 'Segoe UI', Arial, sans-serif";
    ctx.fillText("nectar", 866, 98);
    ctx.fillStyle = "#ffd166";
    ctx.font = "bold 20px 'Segoe UI', Arial, sans-serif";
    ctx.fillText("PRICES", 876, 132);

    ctx.fillStyle = "#fde68a";
    ctx.font = "bold 26px 'Segoe UI', Arial, sans-serif";
    ctx.fillText("26–27 New Bridge Street • Freshly Baked Croissants • Food on the Move", 44, 218);

    return new THREE.CanvasTexture(c);
  }

  function makeBlackFriarSignTexture() {
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = 256;
    const ctx = c.getContext("2d");

    // Deep Victorian bottle-green & ebony polished signboard with ornate gold leaf
    ctx.fillStyle = "#16241c";
    ctx.fillRect(0, 0, 1024, 256);

    ctx.strokeStyle = "#d4af37";
    ctx.lineWidth = 10;
    ctx.strokeRect(14, 14, 996, 228);
    ctx.lineWidth = 3;
    ctx.strokeRect(26, 26, 972, 204);

    ctx.fillStyle = "#f5d061";
    ctx.font = "bold 76px Georgia, 'Times New Roman', serif";
    ctx.textAlign = "center";
    ctx.fillText("THE BLACK FRIAR", 512, 110);

    ctx.fillStyle = "#e8c374";
    ctx.font = "bold 28px Georgia, serif";
    ctx.fillText("EST. 1875 • ARTS & CRAFTS SALOON & SNUG • 174 QUEEN VICTORIA ST", 512, 164);

    ctx.fillStyle = "#cbd5e1";
    ctx.font = "italic 23px Georgia, serif";
    ctx.fillText("“Finest Cask Ales, London Stouts, Wines & Merry Company”", 512, 208);

    return new THREE.CanvasTexture(c);
  }

  function makePubFriezeTexture() {
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = 256;
    const ctx = c.getContext("2d");

    // Cream & gold mosaic background of Henry Poole's 1905 Friar Frieze
    ctx.fillStyle = "#dfd2b5";
    ctx.fillRect(0, 0, 1024, 256);

    // Mosaic tile grid shimmer
    ctx.strokeStyle = "rgba(180, 140, 60, 0.28)";
    ctx.lineWidth = 2;
    for (let x = 0; x < 1024; x += 16) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 256);
      ctx.stroke();
    }
    for (let y = 0; y < 256; y += 16) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1024, y);
      ctx.stroke();
    }

    // Copper/Bronze bas-relief ovals with jolly robed Dominican Friars
    for (let i = 0; i < 4; i++) {
      const cx = 128 + i * 256;
      const cy = 128;
      ctx.fillStyle = "#6e3b23";
      ctx.beginPath();
      ctx.ellipse(cx, cy, 98, 86, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 6;
      ctx.strokeStyle = "#d4af37";
      ctx.stroke();

      // Stylized bronze relief friar silhouette & scroll
      ctx.fillStyle = "#c87d4b";
      ctx.beginPath();
      ctx.arc(cx, cy - 22, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, cy + 32, 42, Math.PI, 0, false);
      ctx.fill();
    }

    ctx.fillStyle = "#3b2112";
    ctx.font = "bold 24px Georgia, serif";
    ctx.textAlign = "center";
    ctx.fillText("SILENCE IS GOLDEN  •  TOMORROW WILL BE FRIDAY  •  DON'T BE A FRIAR", 512, 242);

    return new THREE.CanvasTexture(c);
  }

  function makeAlleyBistroSignTexture() {
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = 256;
    const ctx = c.getContext("2d");

    // Warm antique burgundy & dark timber bistro signboard
    ctx.fillStyle = "#3b1318";
    ctx.fillRect(0, 0, 1024, 256);

    ctx.strokeStyle = "#e6be6a";
    ctx.lineWidth = 8;
    ctx.strokeRect(14, 14, 996, 228);

    ctx.fillStyle = "#f9dfb1";
    ctx.font = "italic bold 26px Georgia, serif";
    ctx.textAlign = "center";
    ctx.fillText("— HIDDEN IN THE ALLEY BEHIND THE BLACK FRIAR PUB —", 512, 58);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 64px Georgia, 'Times New Roman', serif";
    ctx.fillText("LA PETITE COUR • ALLEY BISTRO", 512, 134);

    ctx.fillStyle = "#f4c45a";
    ctx.font = "bold 27px 'Segoe UI', Arial, sans-serif";
    ctx.fillText("BLACKFRIARS LANE & PLAYHOUSE YARD • WOOD-FIRED KITCHEN & WINE BAR", 512, 198);

    return new THREE.CanvasTexture(c);
  }

  function makeMenuBoardTexture() {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 640;
    const ctx = c.getContext("2d");

    // Wooden frame
    ctx.fillStyle = "#5c3820";
    ctx.fillRect(0, 0, 512, 640);
    // Slate chalkboard
    ctx.fillStyle = "#1c2421";
    ctx.fillRect(24, 24, 464, 592);

    ctx.strokeStyle = "#e6be6a";
    ctx.lineWidth = 3;
    ctx.strokeRect(38, 38, 436, 564);

    ctx.fillStyle = "#f6d58e";
    ctx.font = "bold 34px Georgia, serif";
    ctx.textAlign = "center";
    ctx.fillText("ALLEY BISTRO", 256, 92);
    ctx.font = "italic 22px Georgia, serif";
    ctx.fillStyle = "#cbd5e1";
    ctx.fillText("Tonight's Specials Behind The Pub", 256, 128);

    const items = [
      ["Warm Rosemary Focaccia & Olives", "£5.50"],
      ["Burrata & Heritage Tomatoes", "£9.80"],
      ["Handmade Truffle Tagliatelle", "£16.50"],
      ["Pan-Roasted Thames Sea Bass", "£19.50"],
      ["Slow-Braised Beef Cheek Ragù", "£18.00"],
      ["Homemade Tiramisu & Espresso", "£7.50"],
      ["Carafe of House Chianti Classico", "£22.00"]
    ];
    ctx.textAlign = "left";
    items.forEach(([dish, price], i) => {
      const y = 195 + i * 56;
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 21px 'Segoe UI', sans-serif";
      ctx.fillText(dish, 58, y);
      ctx.fillStyle = "#f6c96f";
      ctx.fillText(price, 392, y);
    });

    ctx.textAlign = "center";
    ctx.fillStyle = "#86efac";
    ctx.font = "bold 22px Georgia, serif";
    ctx.fillText("★ WELCOME BACK — TABLE FOR TWO READY ★", 256, 575);

    return new THREE.CanvasTexture(c);
  }

  function makeStreetPlateTexture(streetName, postcode) {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 160;
    const ctx = c.getContext("2d");

    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, 512, 160);
    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 10;
    ctx.strokeRect(6, 6, 500, 148);

    // City of London Red Cross Shield on top-left
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(24, 24, 44, 52);
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2;
    ctx.strokeRect(24, 24, 44, 52);
    ctx.fillStyle = "#dc2626";
    ctx.fillRect(42, 24, 8, 52);
    ctx.fillRect(24, 46, 44, 8);

    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 20px Georgia, serif";
    ctx.fillText("CITY OF LONDON", 82, 54);

    ctx.fillStyle = "#dc2626";
    ctx.font = "bold 22px 'Segoe UI', Arial, sans-serif";
    ctx.fillText(postcode || "EC4V", 418, 54);

    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 36px Georgia, 'Times New Roman', serif";
    ctx.fillText(streetName, 26, 120);

    return new THREE.CanvasTexture(c);
  }

  function makeSolarRoofTexture() {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#102542";
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 2;
    for (let x = 0; x <= 256; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 256);
      ctx.stroke();
    }
    for (let y = 0; y <= 256; y += 16) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(256, y);
      ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(6, 18);
    return tex;
  }

  function makeRoadTexture() {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 512;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#282c35";
    ctx.fillRect(0, 0, 512, 512);

    // Sidewalks (left & right) with granite kerb stones
    ctx.fillStyle = "#8a8379";
    ctx.fillRect(0, 0, 84, 512);
    ctx.fillRect(428, 0, 84, 512);
    ctx.fillStyle = "#b5aea2";
    ctx.fillRect(80, 0, 8, 512);
    ctx.fillRect(424, 0, 8, 512);

    // Blue Cycle Superhighway CS6 lane on west side
    ctx.fillStyle = "#195eb0";
    ctx.fillRect(88, 0, 54, 512);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(142, 0, 4, 512);

    // Double yellow kerb lines
    ctx.fillStyle = "#eab308";
    ctx.fillRect(149, 0, 4, 512);
    ctx.fillRect(156, 0, 4, 512);
    ctx.fillRect(412, 0, 4, 512);
    ctx.fillRect(419, 0, 4, 512);

    // Center dashed white markings
    ctx.fillStyle = "#f1f5f9";
    for (let y = 20; y < 512; y += 96) {
      ctx.fillRect(280, y, 8, 52);
    }

    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 18);
    return tex;
  }

  function makeUndergroundRoundelTexture() {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, 256, 256);

    // Classic TfL Red Circle
    ctx.beginPath();
    ctx.arc(128, 128, 92, 0, Math.PI * 2);
    ctx.lineWidth = 30;
    ctx.strokeStyle = "#dc241f";
    ctx.stroke();

    // Classic TfL Blue Horizontal Bar
    ctx.fillStyle = "#0019a8";
    ctx.fillRect(10, 102, 236, 52);

    // White "UNDERGROUND" / "BLACKFRIARS" lettering
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 25px 'Segoe UI', Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("BLACKFRIARS", 128, 129);

    return new THREE.CanvasTexture(c);
  }

  function makeStationSignTexture() {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 128;
    const ctx = c.getContext("2d");

    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, 512, 128);

    // Circle Line yellow & District Line green stripes at bottom
    ctx.fillStyle = "#ffd329";
    ctx.fillRect(0, 104, 512, 12);
    ctx.fillStyle = "#007d32";
    ctx.fillRect(0, 116, 512, 12);

    // Mini Roundel on left
    ctx.beginPath();
    ctx.arc(58, 52, 28, 0, Math.PI * 2);
    ctx.lineWidth = 10;
    ctx.strokeStyle = "#dc241f";
    ctx.stroke();
    ctx.fillStyle = "#0019a8";
    ctx.fillRect(20, 43, 76, 18);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 30px 'Segoe UI', Arial, sans-serif";
    ctx.fillText("Blackfriars Underground", 112, 50);
    ctx.fillStyle = "#cbd5e1";
    ctx.font = "bold 17px 'Segoe UI', Arial, sans-serif";
    ctx.fillText("Circle & District Lines • Way Out • Thameslink", 112, 82);

    return new THREE.CanvasTexture(c);
  }

  function build(scene) {
    const colliders = []; // 2D AABB obstacles: { minX, maxX, minZ, maxZ }
    const animated = {
      boats: [],
      buses: [],
      taxis: [],
      pedestrians: [],
      gulls: [],
      trains: [],
      tubeTrains: [],
      waterMesh: null,
      waterBaseY: null,
      skyMat: null,
      rainSystem: null,
      belishaGlobes: [],
      candleLights: [],
      beaconMeshes: [],
      lampLights: [],
      pavingMats: []
    };
    const plaqueMeshes = [];

    function addBoxCollider(cx, cz, w, d) {
      colliders.push({
        minX: cx - w * 0.5,
        maxX: cx + w * 0.5,
        minZ: cz - d * 0.5,
        maxZ: cz + d * 0.5
      });
    }

    // Shared materials
    const yorkstoneTex = makeYorkstoneTexture();
    const cobbleTex = makeCobblestoneTexture();
    const matPortland = new THREE.MeshStandardMaterial({ color: 0xdcd3c2, roughness: 0.72, metalness: 0.08 });
    const matDarkGranite = new THREE.MeshStandardMaterial({ color: 0x5c5852, roughness: 0.78, metalness: 0.12 });
    const matBridgeRed = new THREE.MeshStandardMaterial({ color: 0x9e2f2b, roughness: 0.5, metalness: 0.38 });
    const matBridgeCream = new THREE.MeshStandardMaterial({ color: 0xefe6d5, roughness: 0.48, metalness: 0.15 });
    const matGold = new THREE.MeshStandardMaterial({ color: 0xf4c45a, roughness: 0.25, metalness: 0.85, emissive: 0x3a2805 });
    const matIronDark = new THREE.MeshStandardMaterial({ color: 0x22272e, roughness: 0.45, metalness: 0.68 });
    const matGlassBlue = new THREE.MeshStandardMaterial({
      color: 0x7ec8e3,
      roughness: 0.12,
      metalness: 0.88,
      transparent: true,
      opacity: 0.76
    });
    const matGlassCrystalline = new THREE.MeshStandardMaterial({
      color: 0xa5d8ef,
      roughness: 0.08,
      metalness: 0.92,
      transparent: true,
      opacity: 0.82
    });
    const matPaving = new THREE.MeshStandardMaterial({ map: yorkstoneTex, color: 0xd6d0c6, roughness: 0.82, metalness: 0.06 });
    const matCobble = new THREE.MeshStandardMaterial({ map: cobbleTex, color: 0xd4cdc3, roughness: 0.68, metalness: 0.12 });
    const matAsphalt = new THREE.MeshStandardMaterial({ color: 0x282c34, roughness: 0.85, metalness: 0.08 });
    const matParkGrass = new THREE.MeshStandardMaterial({ color: 0x3b6e38, roughness: 0.88 });
    const matWarmOak = new THREE.MeshStandardMaterial({ color: 0x6e472b, roughness: 0.55, metalness: 0.1 });
    const matMahogany = new THREE.MeshStandardMaterial({ color: 0x3d1c10, roughness: 0.35, metalness: 0.2 });
    const matPremierPurple = new THREE.MeshStandardMaterial({ color: 0x4c1d57, roughness: 0.4, metalness: 0.15 });
    const matMarbleGreen = new THREE.MeshStandardMaterial({ color: 0x1a3024, roughness: 0.25, metalness: 0.3 });

    animated.pavingMats.push(matPaving, matCobble, matAsphalt);

    // ========================================================================
    // 0. PROCEDURAL ATMOSPHERIC SKY DOME & RAIN PARTICLE SYSTEM
    // ========================================================================
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        uTopColor: { value: new THREE.Color(0x1b2942) },
        uHorizonColor: { value: new THREE.Color(0xd98a5b) },
        uBottomColor: { value: new THREE.Color(0x1a2230) },
        uSunDir: { value: new THREE.Vector3(-0.7, 0.35, 0.4).normalize() },
        uSunColor: { value: new THREE.Color(0xffb46b) },
        uStarIntensity: { value: 0.35 },
        uTime: { value: 0 }
      },
      vertexShader: `
        varying vec3 vWorldPos;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform vec3 uTopColor;
        uniform vec3 uHorizonColor;
        uniform vec3 uBottomColor;
        uniform vec3 uSunDir;
        uniform vec3 uSunColor;
        uniform float uStarIntensity;
        uniform float uTime;
        varying vec3 vWorldPos;

        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
        }

        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));
          return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }

        void main() {
          vec3 dir = normalize(vWorldPos);
          float h = clamp(dir.y, 0.0, 1.0);
          vec3 col = mix(uHorizonColor, uTopColor, pow(h, 0.55));
          if (dir.y < 0.0) {
            col = mix(uHorizonColor, uBottomColor, clamp(-dir.y * 3.0, 0.0, 1.0));
          }

          // Sun / Moon disc & Mie atmospheric halo
          float sunAmt = max(dot(dir, uSunDir), 0.0);
          col += uSunColor * pow(sunAmt, 14.0) * 0.42;
          col += uSunColor * smoothstep(0.996, 0.9995, sunAmt) * 1.35;

          // Soft drifting London cloud wisps
          if (dir.y > 0.04) {
            vec2 uv = dir.xz / (dir.y + 0.18) * 1.4 + vec2(uTime * 0.012, uTime * 0.006);
            float n = noise(uv * 2.2) * 0.6 + noise(uv * 5.1) * 0.4;
            float cloud = smoothstep(0.52, 0.78, n) * smoothstep(0.04, 0.25, dir.y) * (1.0 - smoothstep(0.65, 0.98, dir.y));
            vec3 cloudCol = mix(uHorizonColor * 1.15, vec3(0.96, 0.95, 0.93), 0.45);
            col = mix(col, cloudCol, cloud * 0.38);
          }

          // Subtle night/dusk starfield near zenith
          if (uStarIntensity > 0.01 && dir.y > 0.18) {
            vec2 suv = floor(dir.xz / (dir.y + 0.1) * 260.0);
            float s = hash(suv);
            if (s > 0.9965) {
              float twinkle = 0.6 + 0.4 * sin(uTime * 3.0 + s * 100.0);
              col += vec3(0.95, 0.97, 1.0) * twinkle * uStarIntensity * smoothstep(0.18, 0.55, dir.y);
            }
          }

          gl_FragColor = vec4(col, 1.0);
        }
      `
    });
    const skyDome = new THREE.Mesh(new THREE.SphereGeometry(920, 32, 20), skyMat);
    scene.add(skyDome);
    animated.skyMat = skyMat;

    // Gentle London Drizzle Rain Particle System (toggled with R key / Weather button)
    const rainCount = 1800;
    const rainGeo = new THREE.BufferGeometry();
    const rainPos = new Float32Array(rainCount * 3);
    for (let i = 0; i < rainCount; i++) {
      rainPos[i * 3] = (Math.random() - 0.5) * 160;
      rainPos[i * 3 + 1] = Math.random() * 55;
      rainPos[i * 3 + 2] = (Math.random() - 0.5) * 160;
    }
    rainGeo.setAttribute("position", new THREE.BufferAttribute(rainPos, 3));
    const rainMat = new THREE.PointsMaterial({
      color: 0xcbd5e1,
      size: 0.22,
      transparent: true,
      opacity: 0.55
    });
    const rainSystem = new THREE.Points(rainGeo, rainMat);
    rainSystem.visible = false;
    scene.add(rainSystem);
    animated.rainSystem = rainSystem;

    // ========================================================================
    // 1. RIVER THAMES & EMBANKMENTS
    // ========================================================================
    const waterGeo = new THREE.PlaneGeometry(920, 180, 96, 32);
    waterGeo.rotateX(-Math.PI / 2);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x163d4f,
      roughness: 0.16,
      metalness: 0.86
    });
    const waterMesh = new THREE.Mesh(waterGeo, waterMat);
    waterMesh.position.set(0, 0, 0);
    scene.add(waterMesh);
    animated.waterMesh = waterMesh;

    // North Bank (Victoria Embankment & Blackfriars city block, Z < -90)
    // Split around the Blackfriars Underground Station stairwell (X: 18 to 44, Z: -134 to -114) so you can descend below street level
    const northGroundWest = new THREE.Mesh(new THREE.BoxGeometry(468, 6, 420), matPaving);
    northGroundWest.position.set(-216, 3, -300);
    scene.add(northGroundWest);

    const northGroundEast = new THREE.Mesh(new THREE.BoxGeometry(406, 6, 420), matPaving);
    northGroundEast.position.set(247, 3, -300);
    scene.add(northGroundEast);

    const northGroundRiverStrip = new THREE.Mesh(new THREE.BoxGeometry(26, 6, 24), matPaving);
    northGroundRiverStrip.position.set(31, 3, -102);
    scene.add(northGroundRiverStrip);

    const northGroundInland = new THREE.Mesh(new THREE.BoxGeometry(26, 6, 376), matPaving);
    northGroundInland.position.set(31, 3, -322);
    scene.add(northGroundInland);

    // North Embankment Granite River Wall & Parapet
    const northWall = new THREE.Mesh(new THREE.BoxGeometry(900, 7.2, 3), matDarkGranite);
    northWall.position.set(0, 3.6, -90);
    scene.add(northWall);

    // Leave gaps in river parapet where bridges & pier stairs cross
    const nParapetW = new THREE.Mesh(new THREE.BoxGeometry(436, 1.2, 1.0), matPortland);
    nParapetW.position.set(-232, 6.6, -90);
    scene.add(nParapetW);
    addBoxCollider(-232, -90, 436, 1.6);

    const nParapetMid = new THREE.Mesh(new THREE.BoxGeometry(17, 1.2, 1.0), matPortland);
    nParapetMid.position.set(13.5, 6.6, -90);
    scene.add(nParapetMid);
    addBoxCollider(13.5, -90, 17, 1.6);

    const nParapetE = new THREE.Mesh(new THREE.BoxGeometry(402, 1.2, 1.0), matPortland);
    nParapetE.position.set(249, 6.6, -90);
    scene.add(nParapetE);
    addBoxCollider(249, -90, 402, 1.6);

    // South Bank (Queen's Walk & Southwark block, Z > +90)
    const southGround = new THREE.Mesh(new THREE.BoxGeometry(900, 6, 360), matPaving);
    southGround.position.set(0, 3, 270);
    scene.add(southGround);

    const southWall = new THREE.Mesh(new THREE.BoxGeometry(900, 7.2, 3), matDarkGranite);
    southWall.position.set(0, 3.6, 90);
    scene.add(southWall);

    const sParapetW = new THREE.Mesh(new THREE.BoxGeometry(436, 1.2, 1.0), matPortland);
    sParapetW.position.set(-232, 6.6, 90);
    scene.add(sParapetW);
    addBoxCollider(-232, 90, 436, 1.6);

    const sParapetMid = new THREE.Mesh(new THREE.BoxGeometry(17, 1.2, 1.0), matPortland);
    sParapetMid.position.set(13.5, 6.6, 90);
    scene.add(sParapetMid);
    addBoxCollider(13.5, 90, 17, 1.6);

    const sParapetE = new THREE.Mesh(new THREE.BoxGeometry(402, 1.2, 1.0), matPortland);
    sParapetE.position.set(249, 6.6, 90);
    scene.add(sParapetE);
    addBoxCollider(249, 90, 402, 1.6);

    // North-South Artery Roads (New Bridge Street extended all the way to Ludgate Circus Z=-390, & Blackfriars Road)
    const roadTex = makeRoadTexture();
    const matRoadDeck = new THREE.MeshStandardMaterial({ map: roadTex, roughness: 0.8 });
    animated.pavingMats.push(matRoadDeck);

    const nRoad = new THREE.Mesh(new THREE.PlaneGeometry(20, 310), matRoadDeck);
    nRoad.rotation.x = -Math.PI / 2;
    nRoad.position.set(-4.5, 6.03, -245);
    scene.add(nRoad);

    const sRoad = new THREE.Mesh(new THREE.PlaneGeometry(18, 240), matRoadDeck);
    sRoad.rotation.x = -Math.PI / 2;
    sRoad.position.set(-4.5, 6.03, 210);
    scene.add(sRoad);

    // Victoria Embankment East-West Roadway
    const embRoad = new THREE.Mesh(new THREE.PlaneGeometry(420, 14), matAsphalt);
    embRoad.rotation.x = -Math.PI / 2;
    embRoad.position.set(-120, 6.02, -106);
    scene.add(embRoad);

    // Queen Victoria Street Diagonal Avenue branching NE from New Bridge Street past The Black Friar Pub
    const qvRoad = new THREE.Mesh(new THREE.PlaneGeometry(14, 155), matAsphalt);
    qvRoad.rotation.order = "YXZ";
    qvRoad.rotation.x = -Math.PI / 2;
    qvRoad.rotation.y = 1.38;
    qvRoad.position.set(78, 6.025, -214);
    scene.add(qvRoad);

    // Dorset Rise Roadway & Sidewalks connecting New Bridge Street (X=-14) to Premier Inn (X=-46) at Z=-301
    const dorsetRoad = new THREE.Mesh(new THREE.PlaneGeometry(34, 9.5), matAsphalt);
    dorsetRoad.rotation.x = -Math.PI / 2;
    dorsetRoad.position.set(-30, 6.025, -301);
    scene.add(dorsetRoad);

    // Helper: Build a UK Zebra Crossing with striped Belisha Beacons
    function addZebraCrossing(cz) {
      const zGroup = new THREE.Group();
      const stripeMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
      for (let sx = -10.5; sx <= 1.5; sx += 2.0) {
        const stripe = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 3.6), stripeMat);
        stripe.rotation.x = -Math.PI / 2;
        stripe.position.set(sx, 6.045, cz);
        zGroup.add(stripe);
      }
      // Tactile blister paving on both kerbs
      const blisterMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.7 });
      [-12.6, 3.6].forEach((bx) => {
        const pad = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 3.8), blisterMat);
        pad.rotation.x = -Math.PI / 2;
        pad.position.set(bx, 6.04, cz);
        zGroup.add(pad);

        // Striped Black & White Belisha Beacon Pole + Flashing Amber Globe
        for (let seg = 0; seg < 6; seg++) {
          const band = new THREE.Mesh(
            new THREE.CylinderGeometry(0.075, 0.075, 0.48, 8),
            new THREE.MeshStandardMaterial({ color: seg % 2 === 0 ? 0x111827 : 0xf8fafc, roughness: 0.4 })
          );
          band.position.set(bx, 6.24 + seg * 0.48, cz - 2.2);
          zGroup.add(band);
        }
        const globe = new THREE.Mesh(
          new THREE.SphereGeometry(0.28, 12, 12),
          new THREE.MeshBasicMaterial({ color: 0xffa500 })
        );
        globe.position.set(bx, 9.05, cz - 2.2);
        zGroup.add(globe);
        animated.belishaGlobes.push(globe);
      });
      scene.add(zGroup);
    }

    // Zebra Crossings at Z = -218 (to Black Friar Pub) & Z = -301 (Dorset Rise / Premier Inn / Tesco / Sainsbury's)
    addZebraCrossing(-218);
    addZebraCrossing(-301);

    // Helper: Mount authentic City of London Street Nameplate
    function addStreetSign(text, postcode, x, y, z, rotY) {
      const tex = makeStreetPlateTexture(text, postcode);
      const plate = new THREE.Mesh(
        new THREE.BoxGeometry(2.2, 0.68, 0.08),
        new THREE.MeshBasicMaterial({ map: tex })
      );
      plate.position.set(x, y, z);
      plate.rotation.y = rotY;
      scene.add(plate);
    }

    addStreetSign("DORSET RISE", "EC4Y", -15.2, 8.2, -293.5, Math.PI * 0.5);
    addStreetSign("NEW BRIDGE ST", "EC4V", -14.8, 8.2, -271.5, Math.PI * 0.5);
    addStreetSign("QUEEN VICTORIA ST", "EC4V", 36.2, 8.2, -216.2, -0.35);
    addStreetSign("BLACKFRIARS LANE", "EC4V", 57.5, 8.2, -220.5, 0);
    addStreetSign("PLAYHOUSE YARD", "EC4V", 59.5, 8.2, -245.5, -Math.PI * 0.5);

    // ========================================================================
    // 2. BLACKFRIARS ROAD BRIDGE (1869) — Center X = -4.5, Z = -90 to +90
    // ========================================================================
    const bridgeGroup = new THREE.Group();
    const bridgeSegments = 36;
    const bridgeLen = 180;
    const segLen = bridgeLen / bridgeSegments;

    for (let i = 0; i < bridgeSegments; i++) {
      const z0 = -90 + i * segLen;
      const zMid = z0 + segLen * 0.5;
      const normZ = zMid / 90;
      const deckY = 6.0 + 2.6 * (1 - normZ * normZ);

      const deckSeg = new THREE.Mesh(new THREE.BoxGeometry(18, 0.7, segLen + 0.15), matRoadDeck);
      deckSeg.position.set(-4.5, deckY - 0.32, zMid);
      bridgeGroup.add(deckSeg);

      [-13.5, 4.5].forEach((bx) => {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.25, segLen + 0.08), matBridgeRed);
        rail.position.set(bx, deckY + 0.62, zMid);
        bridgeGroup.add(rail);

        const topCapping = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.18, segLen + 0.1), matBridgeCream);
        topCapping.position.set(bx, deckY + 1.28, zMid);
        bridgeGroup.add(topCapping);
      });
    }

    addBoxCollider(-13.7, 0, 0.8, 180);
    addBoxCollider(4.7, 0, 0.8, 180);

    const pierZs = [-54, -18, 18, 54];
    pierZs.forEach((pz) => {
      const normZ = pz / 90;
      const deckY = 6.0 + 2.6 * (1 - normZ * normZ);

      const cutwater = new THREE.Mesh(new THREE.BoxGeometry(21, 7.5, 5.2), matDarkGranite);
      cutwater.position.set(-4.5, 2.2, pz);
      bridgeGroup.add(cutwater);

      [-14.3, 5.3].forEach((px) => {
        const col = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.3, 5.6, 12), matBridgeRed);
        col.position.set(px, 4.6, pz);
        bridgeGroup.add(col);

        // Carved Portland stone waterfowl capital & gold City of London shield
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.22, 1.35, 12), matPortland);
        cap.position.set(px, 7.6, pz);
        bridgeGroup.add(cap);

        const crest = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.9, 0.9), matGold);
        crest.position.set(px + (px < 0 ? -1.52 : 1.52), 7.6, pz);
        bridgeGroup.add(crest);

        const pulpit = new THREE.Mesh(new THREE.CylinderGeometry(1.68, 1.68, 1.35, 12), matBridgeCream);
        pulpit.position.set(px, deckY + 0.65, pz);
        bridgeGroup.add(pulpit);
      });
    });

    const archBounds = [-90, -54, -18, 18, 54, 90];
    for (let a = 0; a < 5; a++) {
      const zStart = archBounds[a];
      const zEnd = archBounds[a + 1];
      const span = zEnd - zStart;
      for (let s = 0; s < 8; s++) {
        const t = (s + 0.5) / 8;
        const zPos = zStart + t * span;
        const archCurve = Math.sin(t * Math.PI);
        const ribY = 2.6 + archCurve * 3.8;
        [-13.4, -7.5, -1.5, 4.4].forEach((rx) => {
          const rib = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.9, span / 8 + 0.3), matBridgeRed);
          rib.position.set(rx, ribY, zPos);
          bridgeGroup.add(rib);
        });
      }
    }

    // Victorian Bridge Triple-Globe Street Lamps
    for (let z = -72; z <= 72; z += 36) {
      const normZ = z / 90;
      const deckY = 6.0 + 2.6 * (1 - normZ * normZ);
      [-13.5, 4.5].forEach((lx) => {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, 3.6, 8), matIronDark);
        post.position.set(lx, deckY + 2.9, z);
        bridgeGroup.add(post);

        [-0.38, 0, 0.38].forEach((gz, gi) => {
          const globe = new THREE.Mesh(
            new THREE.SphereGeometry(gi === 1 ? 0.32 : 0.23, 10, 10),
            new THREE.MeshBasicMaterial({ color: 0xffe4a0 })
          );
          globe.position.set(lx, deckY + (gi === 1 ? 4.85 : 4.55), z + gz);
          bridgeGroup.add(globe);
          animated.lampLights.push(globe);
        });
      });
    }

    scene.add(bridgeGroup);

    // ========================================================================
    // 3. 1864 OLD RAILWAY COLUMNS (X = +14, Z = -72 to +72)
    // ========================================================================
    const oldColsGroup = new THREE.Group();
    [-54, -18, 18, 54].forEach((pz) => {
      const pier = new THREE.Mesh(new THREE.BoxGeometry(7.2, 3.8, 4.2), matDarkGranite);
      pier.position.set(14, 1.4, pz);
      oldColsGroup.add(pier);

      [11.8, 16.2].forEach((cx) => {
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.78, 5.2, 12), matBridgeRed);
        shaft.position.set(cx, 5.6, pz);
        oldColsGroup.add(shaft);

        const cap = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.65, 1.75), matBridgeCream);
        cap.position.set(cx, 8.3, pz);
        oldColsGroup.add(cap);
      });
    });
    scene.add(oldColsGroup);

    // ========================================================================
    // 4. BLACKFRIARS SOLAR RAILWAY BRIDGE & STATION (X = +35, Z = -95 to +95)
    // ========================================================================
    const railGroup = new THREE.Group();
    const solarTex = makeSolarRoofTexture();
    const matSolarRoof = new THREE.MeshStandardMaterial({
      map: solarTex,
      roughness: 0.22,
      metalness: 0.75
    });

    const railDeck = new THREE.Mesh(new THREE.BoxGeometry(24, 1.1, 192), matPortland);
    railDeck.position.set(35, 6.85, 0);
    railGroup.add(railDeck);

    const nRamp = new THREE.Mesh(new THREE.BoxGeometry(14, 0.8, 18), matPaving);
    nRamp.position.set(35, 6.5, -104);
    nRamp.rotation.x = 0.085;
    railGroup.add(nRamp);

    const sRamp = new THREE.Mesh(new THREE.BoxGeometry(14, 0.8, 18), matPaving);
    sRamp.position.set(35, 6.5, 104);
    sRamp.rotation.x = -0.085;
    railGroup.add(sRamp);

    [23.2, 46.8].forEach((gx) => {
      const glassWall = new THREE.Mesh(new THREE.BoxGeometry(0.3, 6.2, 188), matGlassBlue);
      glassWall.position.set(gx, 10.5, 0);
      railGroup.add(glassWall);

      for (let z = -84; z <= 84; z += 14) {
        const strut1 = new THREE.Mesh(new THREE.BoxGeometry(0.45, 7.8, 0.45), matIronDark);
        strut1.position.set(gx, 10.5, z);
        strut1.rotation.x = 0.65;
        railGroup.add(strut1);

        const strut2 = new THREE.Mesh(new THREE.BoxGeometry(0.45, 7.8, 0.45), matIronDark);
        strut2.position.set(gx, 10.5, z);
        strut2.rotation.x = -0.65;
        railGroup.add(strut2);
      }
    });
    addBoxCollider(23.2, 0, 0.8, 188);
    addBoxCollider(46.8, 0, 0.8, 188);

    const roofCanopy = new THREE.Mesh(new THREE.CylinderGeometry(13.5, 13.5, 192, 16, 1, false, -Math.PI * 0.35, Math.PI * 0.7), matSolarRoof);
    roofCanopy.rotation.x = Math.PI / 2;
    roofCanopy.scale.set(1.0, 0.35, 1.0);
    roofCanopy.position.set(35, 10.2, 0);
    railGroup.add(roofCanopy);

    [-54, -18, 18, 54].forEach((pz) => {
      const rPier = new THREE.Mesh(new THREE.BoxGeometry(26, 7.0, 5.0), matDarkGranite);
      rPier.position.set(35, 2.8, pz);
      railGroup.add(rPier);
    });

    const trainGroup = new THREE.Group();
    for (let c = 0; c < 4; c++) {
      const car = new THREE.Mesh(
        new THREE.BoxGeometry(3.1, 3.4, 16.5),
        new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.3, metalness: 0.4 })
      );
      car.position.set(0, 1.9, c * 17.5 - 26);
      const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(3.18, 0.6, 16.5),
        new THREE.MeshBasicMaterial({ color: 0xd946ef })
      );
      stripe.position.set(0, 1.9, c * 17.5 - 26);
      trainGroup.add(car, stripe);
    }
    trainGroup.position.set(39.5, 7.4, 0);
    railGroup.add(trainGroup);
    animated.trains.push({ mesh: trainGroup, dir: 1, z: 0 });

    scene.add(railGroup);

    // ========================================================================
    // 5. VACATION MEMORIES & ICONIC BLACKFRIARS ARCHITECTURE
    // ========================================================================

    // --- V1. PREMIER INN LONDON BLACKFRIARS (FLEET STREET) — 1–2 Dorset Rise (X: -68..-46, Z: -318..-284) ---
    const premierGroup = new THREE.Group();
    const premierFacadeMat = new THREE.MeshStandardMaterial({
      map: makeBrickFacadeTexture("#d8cebe", "#2c1e38", 0.78, 8, 6),
      roughness: 0.6
    });
    const premierSignMat = new THREE.MeshBasicMaterial({ map: makePremierInnSignTexture() });
    const matHypnosWhite = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 });
    const matCarpetPurple = new THREE.MeshStandardMaterial({ color: 0x2e1437, roughness: 0.85 });

    // Upper Hotel Tower (Levels 2–7, sitting above the walkable ground floor at Y = 11.2 to 32)
    const piUpper = new THREE.Mesh(new THREE.BoxGeometry(22, 21, 34), premierFacadeMat);
    piUpper.position.set(-57, 21.7, -301);
    premierGroup.add(piUpper);

    // Rooftop Crown Cornice & Illuminated Purple Rooftop Sign
    const piCornice = new THREE.Mesh(new THREE.BoxGeometry(23.2, 1.4, 35.2), matPortland);
    piCornice.position.set(-57, 32.6, -301);
    premierGroup.add(piCornice);

    const piRoofSign = new THREE.Mesh(new THREE.BoxGeometry(0.6, 3.2, 18), premierSignMat);
    piRoofSign.position.set(-46.1, 34.4, -301);
    premierGroup.add(piRoofSign);

    // Vertical Projecting Purple Fin Sign on East Facade (visible all the way from New Bridge Street!)
    const piFin = new THREE.Mesh(new THREE.BoxGeometry(3.2, 11.5, 0.55), matPremierPurple);
    piFin.position.set(-44.6, 17.5, -292);
    const piFinMoon = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.65, 16), matGold);
    piFinMoon.rotation.x = Math.PI / 2;
    piFinMoon.position.set(-44.2, 21.0, -292);
    premierGroup.add(piFin, piFinMoon);

    // Entrance Canopy & Illuminated Fascia above Ground Floor Doors (X = -46, Z = -301)
    const piCanopy = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.5, 14), matPremierPurple);
    piCanopy.position.set(-44.2, 10.6, -301);
    const piEntranceSign = new THREE.Mesh(new THREE.BoxGeometry(0.35, 2.5, 16), premierSignMat);
    piEntranceSign.position.set(-45.8, 10.8, -301);
    premierGroup.add(piCanopy, piEntranceSign);

    // Walkable Ground-Floor Hotel Interior (X: -67 to -46, Z: -317 to -285, Floor Y = 6.04)
    const piFloor = new THREE.Mesh(new THREE.BoxGeometry(21.6, 0.1, 32.6), matWarmOak);
    piFloor.position.set(-56.8, 6.04, -301);
    const piCeiling = new THREE.Mesh(new THREE.BoxGeometry(21.6, 0.3, 32.6), matBridgeCream);
    piCeiling.position.set(-56.8, 11.05, -301);
    premierGroup.add(piFloor, piCeiling);

    // Exterior Ground-Floor Walls with Wide Open Glass Entrance (Z: -304.5 to -297.5 at X = -46)
    const piWallBack = new THREE.Mesh(new THREE.BoxGeometry(0.6, 5.2, 34), matPremierPurple);
    piWallBack.position.set(-67.5, 8.6, -301);
    const piWallNorth = new THREE.Mesh(new THREE.BoxGeometry(22, 5.2, 0.6), matPortland);
    piWallNorth.position.set(-56.8, 8.6, -317.5);
    const piWallSouth = new THREE.Mesh(new THREE.BoxGeometry(22, 5.2, 0.6), matPortland);
    piWallSouth.position.set(-56.8, 8.6, -284.5);
    const piFrontN = new THREE.Mesh(new THREE.BoxGeometry(0.5, 5.2, 12.5), matGlassBlue);
    piFrontN.position.set(-46.0, 8.6, -311.0);
    const piFrontS = new THREE.Mesh(new THREE.BoxGeometry(0.5, 5.2, 12.5), matGlassBlue);
    piFrontS.position.set(-46.0, 8.6, -291.0);
    premierGroup.add(piWallBack, piWallNorth, piWallSouth, piFrontN, piFrontS);

    // Register wall colliders leaving doorway X=-46, Z=[-304.6, -297.4] wide open
    addBoxCollider(-67.5, -301, 1.0, 34);
    addBoxCollider(-56.8, -317.5, 22, 1.0);
    addBoxCollider(-56.8, -284.5, 22, 1.0);
    addBoxCollider(-46.0, -311.0, 0.9, 12.5);
    addBoxCollider(-46.0, -291.0, 0.9, 12.5);

    // Reception Desk & Self-Check-In Kiosks in Center Lobby
    const recDesk = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.15, 6.4), matWarmOak);
    recDesk.position.set(-61.5, 6.6, -301);
    const recTop = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.12, 6.6), matPortland);
    recTop.position.set(-61.5, 7.22, -301);
    const recMoonLogo = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 0.12, 20), matGold);
    recMoonLogo.rotation.z = Math.PI / 2;
    recMoonLogo.position.set(-67.1, 8.8, -301);
    premierGroup.add(recDesk, recTop, recMoonLogo);

    // 2 Purple Self-Check-In Kiosks
    [-304.5, -297.5].forEach((kz) => {
      const kiosk = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.5, 0.8), matPremierPurple);
      kiosk.position.set(-55.5, 6.75, kz);
      const screen = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.55, 0.6), new THREE.MeshBasicMaterial({ color: 0xe0f2fe }));
      screen.position.set(-55.12, 7.2, kz);
      premierGroup.add(kiosk, screen);
    });

    // Thyme Bar & Breakfast Room (North Wing inside Premier Inn: Z = -316 to -306)
    const buffetCounter = new THREE.Mesh(new THREE.BoxGeometry(8.5, 1.05, 1.6), matWarmOak);
    buffetCounter.position.set(-56, 6.55, -315.2);
    // Coffee machine & warm croissant trays
    const espresso = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.75, 0.7), matIronDark);
    espresso.position.set(-58.5, 7.45, -315.2);
    const croissantTray = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.18, 0.9), matGold);
    croissantTray.position.set(-55.0, 7.18, -315.2);
    premierGroup.add(buffetCounter, espresso, croissantTray);

    // Breakfast Tables & Purple Booths
    [-52, -58].forEach((bx) => {
      const tbl = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.78, 12), matPortland);
      tbl.position.set(bx, 6.42, -310.5);
      const seat = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.95, 0.75), matPremierPurple);
      seat.position.set(bx, 6.5, -312.2);
      premierGroup.add(tbl, seat);
    });

    // Guest Room 312 Vignette (South Wing inside Premier Inn: Z = -295 to -286)
    // Famous King-Size Hypnos Bed with Crisp White Duvet & Purple Runner/Pillows
    const roomCarpet = new THREE.Mesh(new THREE.BoxGeometry(9.5, 0.06, 9.0), matCarpetPurple);
    roomCarpet.position.set(-59, 6.08, -290.5);
    const headboard = new THREE.Mesh(new THREE.BoxGeometry(0.35, 2.2, 3.6), matPremierPurple);
    headboard.position.set(-65.8, 7.2, -290.0);
    const mattress = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.72, 3.2), matHypnosWhite);
    mattress.position.set(-63.8, 6.45, -290.0);
    const purpleRunner = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.76, 3.26), matPremierPurple);
    purpleRunner.position.set(-62.6, 6.46, -290.0);
    const pillow1 = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.28, 1.2), matHypnosWhite);
    pillow1.position.set(-65.2, 6.95, -290.8);
    const pillow2 = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.28, 1.2), matHypnosWhite);
    pillow2.position.set(-65.2, 6.95, -289.2);
    premierGroup.add(roomCarpet, headboard, mattress, purpleRunner, pillow1, pillow2);

    const piLight = new THREE.PointLight(0xffe0b2, 1.35, 28);
    piLight.position.set(-55, 10.2, -301);
    premierGroup.add(piLight);
    scene.add(premierGroup);

    // --- V2. TESCO EXPRESS (20–21 New Bridge Street: X = -32..-15, Z = -290..-270) ---
    const tescoGroup = new THREE.Group();
    const tescoUpperMat = new THREE.MeshStandardMaterial({
      map: makeBrickFacadeTexture("#8c4636", "#ffdfa0", 0.55, 6, 5),
      roughness: 0.68
    });
    const tescoSignMat = new THREE.MeshBasicMaterial({ map: makeTescoSignTexture() });
    const matTescoBlue = new THREE.MeshStandardMaterial({ color: 0x00539f, roughness: 0.35 });
    const matTescoRed = new THREE.MeshStandardMaterial({ color: 0xee1c25, roughness: 0.35 });
    const matShopFloor = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.45 });

    // Upper Victorian Red-Brick Storeys (Y = 10.8 to 24.8)
    const tescoUpper = new THREE.Mesh(new THREE.BoxGeometry(17, 14, 20), tescoUpperMat);
    tescoUpper.position.set(-23.5, 17.8, -280);
    tescoGroup.add(tescoUpper);

    // Illuminated Tesco Express Fascia Board facing New Bridge Street (X = -14.8) & Dorset Rise (Z = -290.2)
    const tescoFasciaE = new THREE.Mesh(new THREE.BoxGeometry(0.35, 2.35, 19.8), tescoSignMat);
    tescoFasciaE.position.set(-14.9, 10.0, -280);
    const tescoFasciaN = new THREE.Mesh(new THREE.BoxGeometry(16.8, 2.35, 0.35), tescoSignMat);
    tescoFasciaN.position.set(-23.5, 10.0, -290.1);
    tescoGroup.add(tescoFasciaE, tescoFasciaN);

    // Walkable Tesco Express Ground-Floor Interior (X: -32 to -15, Z: -290 to -270)
    const tescoFloor = new THREE.Mesh(new THREE.BoxGeometry(16.8, 0.1, 19.6), matShopFloor);
    tescoFloor.position.set(-23.5, 6.04, -280);
    const tescoCeil = new THREE.Mesh(new THREE.BoxGeometry(16.8, 0.25, 19.6), new THREE.MeshBasicMaterial({ color: 0xf8fafc }));
    tescoCeil.position.set(-23.5, 10.6, -280);
    tescoGroup.add(tescoFloor, tescoCeil);

    // Store Walls leaving East Entrance (X = -15, Z: -283.2 to -276.8) wide open
    const tWallW = new THREE.Mesh(new THREE.BoxGeometry(0.5, 4.6, 20), matPortland);
    tWallW.position.set(-31.8, 8.3, -280);
    const tWallN = new THREE.Mesh(new THREE.BoxGeometry(17, 4.6, 0.5), matPortland);
    tWallN.position.set(-23.5, 8.3, -289.8);
    const tWallS = new THREE.Mesh(new THREE.BoxGeometry(17, 4.6, 0.5), matPortland);
    tWallS.position.set(-23.5, 8.3, -270.2);
    const tFrontN = new THREE.Mesh(new THREE.BoxGeometry(0.4, 4.6, 6.4), matGlassBlue);
    tFrontN.position.set(-15.1, 8.3, -286.6);
    const tFrontS = new THREE.Mesh(new THREE.BoxGeometry(0.4, 4.6, 6.4), matGlassBlue);
    tFrontS.position.set(-15.1, 8.3, -273.4);
    tescoGroup.add(tWallW, tWallN, tWallS, tFrontN, tFrontS);

    addBoxCollider(-31.8, -280, 0.9, 20);
    addBoxCollider(-23.5, -289.8, 17, 0.9);
    addBoxCollider(-23.5, -270.2, 17, 0.9);
    addBoxCollider(-15.1, -286.6, 0.8, 6.4);
    addBoxCollider(-15.1, -273.4, 0.8, 6.4);

    // Chilled Meal Deal Fridges along back wall (X = -30.6) with colorful sandwich/drink shelves
    const mealFridge = new THREE.Mesh(new THREE.BoxGeometry(1.2, 3.4, 15.5), matIronDark);
    mealFridge.position.set(-30.6, 7.7, -280);
    const mealHeader = new THREE.Mesh(
      new THREE.BoxGeometry(1.3, 0.5, 15.5),
      new THREE.MeshBasicMaterial({ color: 0xffd700 })
    );
    mealHeader.position.set(-30.5, 9.5, -280);
    tescoGroup.add(mealFridge, mealHeader);

    const itemColors = [0x38bdf8, 0xfacc15, 0x4ade80, 0xf87171, 0xc084fc];
    for (let sh = 0; sh < 4; sh++) {
      const shelfGlow = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 0.55, 14.8),
        new THREE.MeshBasicMaterial({ color: itemColors[sh % itemColors.length] })
      );
      shelfGlow.position.set(-30.3, 6.55 + sh * 0.72, -280);
      tescoGroup.add(shelfGlow);
    }

    // 2 Central Grocery Gondola Aisles
    [-277, -283].forEach((az) => {
      const aisle = new THREE.Mesh(new THREE.BoxGeometry(6.8, 1.9, 1.1), matTescoBlue);
      aisle.position.set(-24.2, 7.0, az);
      const topCap = new THREE.Mesh(new THREE.BoxGeometry(6.9, 0.25, 1.15), matTescoRed);
      topCap.position.set(-24.2, 8.0, az);
      tescoGroup.add(aisle, topCap);
    });

    // 3 Tesco Self-Checkout Kiosks near entrance ("Unexpected item in bagging area!")
    [-287.5, -285.5, -273.0].forEach((ckz) => {
      const unit = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.35, 0.85), matTescoBlue);
      unit.position.set(-18.2, 6.7, ckz);
      const scr = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.45, 0.5), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      scr.position.set(-17.72, 7.2, ckz);
      const scanner = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.08, 0.25), matTescoRed);
      scanner.position.set(-17.85, 6.95, ckz);
      tescoGroup.add(unit, scr, scanner);
    });

    const tescoLight = new THREE.PointLight(0xf0f9ff, 1.25, 22);
    tescoLight.position.set(-23, 9.8, -280);
    tescoGroup.add(tescoLight);
    scene.add(tescoGroup);

    // --- V3. SAINSBURY'S LOCAL (26–27 New Bridge Street: X = -32..-15, Z = -332..-312) ---
    const sainsGroup = new THREE.Group();
    const sainsUpperMat = new THREE.MeshStandardMaterial({
      map: makeBrickFacadeTexture("#d2c6b2", "#334155", 0.52, 6, 5),
      roughness: 0.65
    });
    const sainsSignMat = new THREE.MeshBasicMaterial({ map: makeSainsburysSignTexture() });
    const matSainsOrange = new THREE.MeshStandardMaterial({ color: 0xf06c00, roughness: 0.35 });
    const matSainsPlum = new THREE.MeshStandardMaterial({ color: 0x4a152d, roughness: 0.45 });

    // Upper Portland Stone Storeys (Y = 10.8 to 24.8)
    const sainsUpper = new THREE.Mesh(new THREE.BoxGeometry(17, 14, 20), sainsUpperMat);
    sainsUpper.position.set(-23.5, 17.8, -322);
    sainsGroup.add(sainsUpper);

    // Illuminated Sainsbury's Local Orange & Plum Fascia facing New Bridge St & Dorset Rise
    const sainsFasciaE = new THREE.Mesh(new THREE.BoxGeometry(0.35, 2.35, 19.8), sainsSignMat);
    sainsFasciaE.position.set(-14.9, 10.0, -322);
    const sainsFasciaS = new THREE.Mesh(new THREE.BoxGeometry(16.8, 2.35, 0.35), sainsSignMat);
    sainsFasciaS.position.set(-23.5, 10.0, -311.9);
    sainsGroup.add(sainsFasciaE, sainsFasciaS);

    // Walkable Sainsbury's Local Interior (X: -32 to -15, Z: -332 to -312)
    const sainsFloor = new THREE.Mesh(new THREE.BoxGeometry(16.8, 0.1, 19.6), matWarmOak);
    sainsFloor.position.set(-23.5, 6.04, -322);
    const sainsCeil = new THREE.Mesh(new THREE.BoxGeometry(16.8, 0.25, 19.6), new THREE.MeshBasicMaterial({ color: 0xfff7ed }));
    sainsCeil.position.set(-23.5, 10.6, -322);
    sainsGroup.add(sainsFloor, sainsCeil);

    // Walls leaving East Doorway (X = -15, Z: -325.2 to -318.8) wide open
    const sWallW = new THREE.Mesh(new THREE.BoxGeometry(0.5, 4.6, 20), matPortland);
    sWallW.position.set(-31.8, 8.3, -322);
    const sWallN = new THREE.Mesh(new THREE.BoxGeometry(17, 4.6, 0.5), matPortland);
    sWallN.position.set(-23.5, 8.3, -331.8);
    const sWallS = new THREE.Mesh(new THREE.BoxGeometry(17, 4.6, 0.5), matPortland);
    sWallS.position.set(-23.5, 8.3, -312.2);
    const sFrontN = new THREE.Mesh(new THREE.BoxGeometry(0.4, 4.6, 6.4), matGlassBlue);
    sFrontN.position.set(-15.1, 8.3, -328.6);
    const sFrontS = new THREE.Mesh(new THREE.BoxGeometry(0.4, 4.6, 6.4), matGlassBlue);
    sFrontS.position.set(-15.1, 8.3, -315.4);
    sainsGroup.add(sWallW, sWallN, sWallS, sFrontN, sFrontS);

    addBoxCollider(-31.8, -322, 0.9, 20);
    addBoxCollider(-23.5, -331.8, 17, 0.9);
    addBoxCollider(-23.5, -312.2, 17, 0.9);
    addBoxCollider(-15.1, -328.6, 0.8, 6.4);
    addBoxCollider(-15.1, -315.4, 0.8, 6.4);

    // Warm Wooden In-Store Bakery Display (stocked with golden croissants & loaves)
    const bakeryUnit = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.8, 14), matWarmOak);
    bakeryUnit.position.set(-30.4, 7.4, -322);
    const bakeryHeader = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.55, 14), matSainsOrange);
    bakeryHeader.position.set(-30.3, 9.0, -322);
    sainsGroup.add(bakeryUnit, bakeryHeader);

    for (let bRow = 0; bRow < 3; bRow++) {
      const pastryTray = new THREE.Mesh(
        new THREE.BoxGeometry(1.1, 0.35, 13.2),
        new THREE.MeshBasicMaterial({ color: 0xfbbf24 })
      );
      pastryTray.position.set(-30.1, 6.55 + bRow * 0.68, -322);
      sainsGroup.add(pastryTray);
    }

    // Sainsbury's Orange & Plum Grocery Aisles + Self-Checkouts
    [-319, -325].forEach((az) => {
      const aisle = new THREE.Mesh(new THREE.BoxGeometry(6.5, 1.85, 1.1), matSainsPlum);
      aisle.position.set(-24.0, 6.95, az);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.25, 1.15), matSainsOrange);
      cap.position.set(-24.0, 7.95, az);
      sainsGroup.add(aisle, cap);
    });

    [-329.0, -327.0, -315.0].forEach((ckz) => {
      const unit = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.35, 0.85), matSainsOrange);
      unit.position.set(-18.2, 6.7, ckz);
      sainsGroup.add(unit);
    });

    const sainsLight = new THREE.PointLight(0xffedd5, 1.25, 22);
    sainsLight.position.set(-23, 9.8, -322);
    sainsGroup.add(sainsLight);
    scene.add(sainsGroup);

    // --- V4. THE BLACK FRIAR PUB (174 Queen Victoria St: X = 37..57, Z = -238..-216) ---
    // Built at its authentic real-world wedge corner where Queen Victoria St meets New Bridge St & Blackfriars Lane!
    const pubGroup = new THREE.Group();
    const pubUpperMat = new THREE.MeshStandardMaterial({
      map: makeBrickFacadeTexture("#4a2518", "#f7d37e", 0.9, 5, 4),
      roughness: 0.55
    });
    const pubSignMat = new THREE.MeshBasicMaterial({ map: makeBlackFriarSignTexture() });
    const pubFriezeMat = new THREE.MeshBasicMaterial({ map: makePubFriezeTexture() });

    // Upper Arts & Crafts Wedge Storeys (Y = 11.4 to 23.4)
    const pubUpper = new THREE.Mesh(new THREE.BoxGeometry(20, 12, 22), pubUpperMat);
    pubUpper.position.set(47, 17.4, -227);
    pubGroup.add(pubUpper);

    // Henry Poole's 1905 Cream & Gold Mosaic Frieze with Copper Friar Bas-Reliefs (Y = 10.6 to 12.6)
    const pubFriezeW = new THREE.Mesh(new THREE.BoxGeometry(0.45, 2.2, 22.4), pubFriezeMat);
    pubFriezeW.position.set(36.9, 11.8, -227);
    const pubFriezeS = new THREE.Mesh(new THREE.BoxGeometry(20.4, 2.2, 0.45), pubFriezeMat);
    pubFriezeS.position.set(47, 11.8, -215.9);
    const pubFriezeN = new THREE.Mesh(new THREE.BoxGeometry(20.4, 2.2, 0.45), pubFriezeMat);
    pubFriezeN.position.set(47, 11.8, -238.1);
    pubGroup.add(pubFriezeW, pubFriezeS, pubFriezeN);

    // Gold-Leaf "THE BLACK FRIAR" Signboards over Ground Floor
    const pubSignW = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.85, 21.8), pubSignMat);
    pubSignW.position.set(36.85, 9.7, -227);
    const pubSignS = new THREE.Mesh(new THREE.BoxGeometry(19.8, 1.85, 0.4), pubSignMat);
    pubSignS.position.set(47, 9.7, -215.85);
    pubGroup.add(pubSignW, pubSignS);

    // Iconic Sculpted 3D Golden-Bronze Black Friar Statue above the SW Apex Corner Portal (X = 36.8, Z = -217.5)
    const corbel = new THREE.Mesh(new THREE.ConeGeometry(0.85, 1.4, 10), matPortland);
    corbel.rotation.x = Math.PI;
    corbel.position.set(36.6, 10.2, -217.5);
    const friarRobe = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.62, 1.9, 12), matGold);
    friarRobe.position.set(36.6, 11.8, -217.5);
    const friarHead = new THREE.Mesh(new THREE.SphereGeometry(0.36, 12, 12), matGold);
    friarHead.position.set(36.6, 13.0, -217.5);
    pubGroup.add(corbel, friarRobe, friarHead);

    // Walkable Grade II* Barrel-Vaulted Marble & Mother-of-Pearl Saloon Interior (X: 37 to 57, Z: -238 to -216)
    const pubFloor = new THREE.Mesh(new THREE.BoxGeometry(19.6, 0.12, 21.6), matMahogany);
    pubFloor.position.set(47, 6.05, -227);
    const pubVault = new THREE.Mesh(
      new THREE.CylinderGeometry(9.2, 9.2, 19.6, 16, 1, false, -Math.PI * 0.5, Math.PI),
      matGold
    );
    pubVault.rotation.z = Math.PI / 2;
    pubVault.scale.set(0.32, 1.0, 1.0);
    pubVault.position.set(47, 10.2, -227);
    pubGroup.add(pubFloor, pubVault);

    // Polished Green Marble Exterior Pilasters & Walls leaving West Front Door (X=37, Z:-230..-223) AND East Alley Door (X=57, Z:-231..-224) open!
    const pWallN = new THREE.Mesh(new THREE.BoxGeometry(20, 4.8, 0.6), matMarbleGreen);
    pWallN.position.set(47, 8.4, -237.8);
    const pWallS = new THREE.Mesh(new THREE.BoxGeometry(20, 4.8, 0.6), matMarbleGreen);
    pWallS.position.set(47, 8.4, -216.2);
    const pWallWN = new THREE.Mesh(new THREE.BoxGeometry(0.6, 4.8, 7.2), matMarbleGreen);
    pWallWN.position.set(37.2, 8.4, -234.2);
    const pWallWS = new THREE.Mesh(new THREE.BoxGeometry(0.6, 4.8, 6.6), matMarbleGreen);
    pWallWS.position.set(37.2, 8.4, -219.5);
    const pWallEN = new THREE.Mesh(new THREE.BoxGeometry(0.6, 4.8, 6.8), matMarbleGreen);
    pWallEN.position.set(56.8, 8.4, -234.4);
    const pWallES = new THREE.Mesh(new THREE.BoxGeometry(0.6, 4.8, 7.4), matMarbleGreen);
    pWallES.position.set(56.8, 8.4, -219.9);
    pubGroup.add(pWallN, pWallS, pWallWN, pWallWS, pWallEN, pWallES);

    addBoxCollider(47, -237.8, 20, 1.0);
    addBoxCollider(47, -216.2, 20, 1.0);
    addBoxCollider(37.2, -234.2, 1.0, 7.2);
    addBoxCollider(37.2, -219.5, 1.0, 6.6);
    addBoxCollider(56.8, -234.4, 1.0, 6.8);
    addBoxCollider(56.8, -219.9, 1.0, 7.4);

    // Mahogany Saloon Bar Counter & Gleaming Brass Real-Ale Hand-Pumps inside The Black Friar
    const barCounter = new THREE.Mesh(new THREE.BoxGeometry(10.5, 1.15, 2.0), matMahogany);
    barCounter.position.set(47, 6.6, -234.2);
    const barBrassTop = new THREE.Mesh(new THREE.BoxGeometry(10.7, 0.1, 2.2), matGold);
    barBrassTop.position.set(47, 7.22, -234.2);
    pubGroup.add(barCounter, barBrassTop);

    for (let tap = -3; tap <= 3; tap += 1.2) {
      const pump = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.55, 8), matGold);
      pump.position.set(47 + tap, 7.52, -233.6);
      pump.rotation.x = 0.25;
      pubGroup.add(pump);
    }

    // Outdoor Wooden Beer Barrels along the sunny pavement outside The Black Friar
    [[34.5, -218.5], [34.5, -232.5], [42.0, -213.8], [48.5, -213.8]].forEach(([bx, bz]) => {
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.48, 1.08, 12), matWarmOak);
      barrel.position.set(bx, 6.55, bz);
      pubGroup.add(barrel);
    });

    const pubLight = new THREE.PointLight(0xffb74d, 1.5, 26);
    pubLight.position.set(47, 9.4, -227);
    pubGroup.add(pubLight);
    scene.add(pubGroup);

    // --- V5. THE SECRET ALLEY BEHIND THE PUB (Blackfriars Lane / Playhouse Yard) & LITTLE ALLEYWAY RESTAURANT ---
    // Located directly behind The Black Friar Pub (X: 40..72, Z: -282..-240)
    const alleyGroup = new THREE.Group();

    // Cobblestone Paving across Blackfriars Lane & Playhouse Yard Courtyard behind the pub
    const alleyCobbles = new THREE.Mesh(new THREE.PlaneGeometry(34, 58), matCobble);
    alleyCobbles.rotation.x = -Math.PI / 2;
    alleyCobbles.position.set(56, 6.035, -258);
    alleyGroup.add(alleyCobbles);

    // Historic Brick & Portland Stone Entrance Archway into Blackfriars Lane alongside The Black Friar Pub (X = 61.5, Z = -222)
    const archPillarL = new THREE.Mesh(new THREE.BoxGeometry(1.4, 6.4, 1.4), matPortland);
    archPillarL.position.set(57.8, 9.2, -222);
    const archPillarR = new THREE.Mesh(new THREE.BoxGeometry(1.4, 6.4, 1.4), matPortland);
    archPillarR.position.set(65.2, 9.2, -222);
    const archBeam = new THREE.Mesh(new THREE.BoxGeometry(9.2, 1.6, 1.6), matPortland);
    archBeam.position.set(61.5, 12.8, -222);
    const archLantern = new THREE.Mesh(
      new THREE.SphereGeometry(0.38, 10, 10),
      new THREE.MeshBasicMaterial({ color: 0xffdf80 })
    );
    archLantern.position.set(61.5, 11.5, -222);
    alleyGroup.add(archPillarL, archPillarR, archBeam, archLantern);

    // Eastern Priory Courtyard Brick Flanking Building (Apothecaries' Hall Wing at X = 69, Z = -256)
    const prioryWallMat = new THREE.MeshStandardMaterial({
      map: makeBrickFacadeTexture("#6e392b", "#ffdfa0", 0.65, 6, 5),
      roughness: 0.75
    });
    const prioryEastWing = new THREE.Mesh(new THREE.BoxGeometry(8, 17, 50), prioryWallMat);
    prioryEastWing.position.set(69.5, 14.5, -256);
    alleyGroup.add(prioryEastWing);
    addBoxCollider(69.5, -256, 8, 50);

    // Overhead Strings of Warm Golden Bistro Fairy Lights crisscrossing the Alleyway (Z = -238 to -274)
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffe082 });
    for (let fz = -240; fz >= -272; fz -= 6.5) {
      for (let fx = 46; fx <= 64; fx += 2.25) {
        const sag = Math.sin(((fx - 46) / 18) * Math.PI) * 0.55;
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), bulbMat);
        bulb.position.set(fx, 10.4 - sag, fz);
        alleyGroup.add(bulb);
      }
    }

    // THE LITTLE ALLEYWAY RESTAURANT ("La Petite Cour — Blackfriars Alley Bistro", X: 43..57, Z: -275..-253)
    const bistroUpperMat = new THREE.MeshStandardMaterial({
      map: makeBrickFacadeTexture("#7a372a", "#ffe4a0", 0.85, 5, 4),
      roughness: 0.68
    });
    const bistroSignMat = new THREE.MeshBasicMaterial({ map: makeAlleyBistroSignTexture() });
    const menuBoardMat = new THREE.MeshBasicMaterial({ map: makeMenuBoardTexture() });
    const matBurgundy = new THREE.MeshStandardMaterial({ color: 0x5c161e, roughness: 0.5 });

    // Upper Historic Brick Townhouse above the Alley Restaurant (Y = 10.6 to 22.6)
    const bistroUpper = new THREE.Mesh(new THREE.BoxGeometry(14, 12, 22), bistroUpperMat);
    bistroUpper.position.set(50, 16.6, -264);
    alleyGroup.add(bistroUpper);

    // Hand-Lettered Burgundy & Gold Bistro Signboard + Striped Fabric Awning facing the Alley & Courtyard (Z = -252.8 & X = 57.2)
    const bistroSignN = new THREE.Mesh(new THREE.BoxGeometry(13.8, 1.8, 0.35), bistroSignMat);
    bistroSignN.position.set(50, 10.0, -252.8);
    const bistroSignE = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.8, 21.8), bistroSignMat);
    bistroSignE.position.set(57.2, 10.0, -264);
    const bistroAwning = new THREE.Mesh(new THREE.BoxGeometry(14.2, 0.45, 2.8), matBurgundy);
    bistroAwning.position.set(50, 9.0, -251.6);
    bistroAwning.rotation.x = 0.22;
    alleyGroup.add(bistroSignN, bistroSignE, bistroAwning);

    // Chalkboard A-Frame "Tonight's Specials" Menu Board standing on the cobblestones outside the door (X = 55.2, Z = -250.5)
    const aBoard = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.35, 0.14), menuBoardMat);
    aBoard.position.set(55.0, 6.68, -250.2);
    aBoard.rotation.y = 0.28;
    alleyGroup.add(aBoard);

    // 4 Intimate Candlelit Outdoor Bistro Tables in the Cobblestone Courtyard behind the Pub
    [
      [47.5, -246.5],
      [53.0, -246.5],
      [59.8, -250.0],
      [59.8, -256.5]
    ].forEach(([tx, tz]) => {
      const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.32, 0.78, 8), matIronDark);
      ped.position.set(tx, 6.4, tz);
      const cloth = new THREE.Mesh(new THREE.CylinderGeometry(0.82, 0.88, 0.12, 14), matHypnosWhite);
      cloth.position.set(tx, 6.82, tz);
      const candle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.09, 0.11, 0.24, 8),
        new THREE.MeshBasicMaterial({ color: 0xffb300 })
      );
      candle.position.set(tx, 6.98, tz);
      alleyGroup.add(ped, cloth, candle);
    });

    // Walkable Cozy Restaurant Dining Room Interior (X: 43 to 57, Z: -275 to -253)
    const bistroFloor = new THREE.Mesh(new THREE.BoxGeometry(13.8, 0.1, 21.8), matWarmOak);
    bistroFloor.position.set(50, 6.04, -264);
    const bistroCeil = new THREE.Mesh(new THREE.BoxGeometry(13.8, 0.25, 21.8), matMahogany);
    bistroCeil.position.set(50, 10.4, -264);
    alleyGroup.add(bistroFloor, bistroCeil);

    // Restaurant Walls leaving North Courtyard Entrance (Z = -253, X: 47.2..52.8) AND East Alley Entrance (X = 57, Z: -263..-257) wide open!
    const bWallW = new THREE.Mesh(new THREE.BoxGeometry(0.5, 4.5, 22), prioryWallMat);
    bWallW.position.set(43.2, 8.25, -264);
    const bWallS = new THREE.Mesh(new THREE.BoxGeometry(14, 4.5, 0.5), prioryWallMat);
    bWallS.position.set(50, 8.25, -274.8);
    const bWallNL = new THREE.Mesh(new THREE.BoxGeometry(4.0, 4.5, 0.45), matBurgundy);
    bWallNL.position.set(45.2, 8.25, -253.2);
    const bWallNR = new THREE.Mesh(new THREE.BoxGeometry(4.0, 4.5, 0.45), matBurgundy);
    bWallNR.position.set(54.8, 8.25, -253.2);
    const bWallES = new THREE.Mesh(new THREE.BoxGeometry(0.45, 4.5, 11.5), matBurgundy);
    bWallES.position.set(56.8, 8.25, -269.0);
    alleyGroup.add(bWallW, bWallS, bWallNL, bWallNR, bWallES);

    addBoxCollider(43.2, -264, 0.9, 22);
    addBoxCollider(50, -274.8, 14, 0.9);
    addBoxCollider(45.2, -253.2, 4.0, 0.8);
    addBoxCollider(54.8, -253.2, 4.0, 0.8);
    addBoxCollider(56.8, -269.0, 0.8, 11.5);

    // Interior Candlelit Tables & Corner Wine/Espresso Bar inside the Alley Restaurant
    const wineBar = new THREE.Mesh(new THREE.BoxGeometry(6.5, 1.15, 1.6), matMahogany);
    wineBar.position.set(47.5, 6.6, -272.5);
    alleyGroup.add(wineBar);

    [
      [46.5, -258.5],
      [53.0, -258.5],
      [46.5, -265.0],
      [53.0, -265.0]
    ].forEach(([ix, iz]) => {
      const tbl = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.78, 14), matHypnosWhite);
      tbl.position.set(ix, 6.42, iz);
      const lamp = new THREE.Mesh(
        new THREE.SphereGeometry(0.16, 10, 10),
        new THREE.MeshBasicMaterial({ color: 0xffca28 })
      );
      lamp.position.set(ix, 6.95, iz);
      alleyGroup.add(tbl, lamp);
    });

    const alleyLight = new THREE.PointLight(0xffcc80, 1.55, 30);
    alleyLight.position.set(53, 9.6, -254);
    alleyGroup.add(alleyLight);
    scene.add(alleyGroup);

    // --- A0. BLACKFRIARS UNDERGROUND STATION (Circle & District Lines, North Bank: X = 18..54, Z = -134..-114) ---
    const undergroundGroup = new THREE.Group();
    const roundelTex = makeUndergroundRoundelTexture();
    const signTex = makeStationSignTexture();
    const matRoundel = new THREE.MeshBasicMaterial({ map: roundelTex, transparent: true, side: THREE.DoubleSide });
    const matStationSign = new THREE.MeshBasicMaterial({ map: signTex });
    const matTileCream = new THREE.MeshStandardMaterial({ color: 0xf3efe4, roughness: 0.35, metalness: 0.1 });
    const matDistrictGreen = new THREE.MeshStandardMaterial({ color: 0x007d32, roughness: 0.3 });
    const matCircleYellow = new THREE.MeshBasicMaterial({ color: 0xffd329 });

    const pavRoof = new THREE.Mesh(new THREE.BoxGeometry(27, 0.5, 21), matIronDark);
    pavRoof.position.set(31, 11.4, -124);
    undergroundGroup.add(pavRoof);

    const pavGlassN = new THREE.Mesh(new THREE.BoxGeometry(26, 5.2, 0.25), matGlassBlue);
    pavGlassN.position.set(31, 8.6, -134);
    const pavGlassS = new THREE.Mesh(new THREE.BoxGeometry(26, 5.2, 0.25), matGlassBlue);
    pavGlassS.position.set(31, 8.6, -114);
    undergroundGroup.add(pavGlassN, pavGlassS);

    const entranceFascia = new THREE.Mesh(new THREE.BoxGeometry(0.4, 2.2, 18), matStationSign);
    entranceFascia.position.set(17.8, 10.2, -124);
    undergroundGroup.add(entranceFascia);

    const totemPost = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 4.6, 10), matIronDark);
    totemPost.position.set(15.2, 8.3, -115.5);
    const totemSign = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 2.1), matRoundel);
    totemSign.position.set(15.2, 10.8, -115.5);
    totemSign.rotation.y = Math.PI * 0.5;
    undergroundGroup.add(totemPost, totemSign);

    const numSteps = 16;
    for (let s = 0; s < numSteps; s++) {
      const t = s / numSteps;
      const sx = 18.4 + t * 13.6;
      const sy = 6.0 - (s + 1) * (4.8 / numSteps);
      const stepMesh = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.35, 19.6), matDarkGranite);
      stepMesh.position.set(sx, sy, -124);
      undergroundGroup.add(stepMesh);
    }

    const escDivider = new THREE.Mesh(new THREE.BoxGeometry(14.5, 0.9, 0.5), matPortland);
    escDivider.position.set(25.2, 4.1, -124);
    escDivider.rotation.z = -0.335;
    undergroundGroup.add(escDivider);

    const subFloor = new THREE.Mesh(new THREE.BoxGeometry(30, 0.6, 26), matDarkGranite);
    subFloor.position.set(44, 0.9, -124);
    undergroundGroup.add(subFloor);

    const subWallN = new THREE.Mesh(new THREE.BoxGeometry(40, 5.2, 0.5), matTileCream);
    subWallN.position.set(38, 3.6, -134.2);
    const subWallS = new THREE.Mesh(new THREE.BoxGeometry(40, 5.2, 0.5), matTileCream);
    subWallS.position.set(38, 3.6, -113.8);
    const subWallE = new THREE.Mesh(new THREE.BoxGeometry(0.5, 5.2, 26), matTileCream);
    subWallE.position.set(57.5, 3.6, -124);
    undergroundGroup.add(subWallN, subWallS, subWallE);

    [-133.9, -114.1].forEach((wz) => {
      const greenBand = new THREE.Mesh(new THREE.BoxGeometry(38, 0.35, 0.1), matDistrictGreen);
      greenBand.position.set(38, 3.8, wz);
      const yellowBand = new THREE.Mesh(new THREE.BoxGeometry(38, 0.25, 0.1), matCircleYellow);
      yellowBand.position.set(38, 4.15, wz);
      undergroundGroup.add(greenBand, yellowBand);
    });

    [-129, -119].forEach((rz) => {
      const wallRoundel = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.8), matRoundel);
      wallRoundel.position.set(57.1, 3.8, rz);
      wallRoundel.rotation.y = -Math.PI * 0.5;
      undergroundGroup.add(wallRoundel);
    });

    [-130, -126, -122, -118].forEach((gz) => {
      const stanchion = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.1, 0.45), matPortland);
      stanchion.position.set(35, 1.75, gz);
      const yellowReader = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.06, 12), matCircleYellow);
      yellowReader.position.set(34.4, 2.32, gz);
      undergroundGroup.add(stanchion, yellowReader);
    });

    const trackBed = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.4, 70), matAsphalt);
    trackBed.position.set(53.5, 0.3, -124);
    undergroundGroup.add(trackBed);

    const safetyLine = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.05, 24), matCircleYellow);
    safetyLine.position.set(49.8, 1.22, -124);
    undergroundGroup.add(safetyLine);

    const tubeTrain = new THREE.Group();
    for (let tc = 0; tc < 3; tc++) {
      const carZ = (tc - 1) * 11.2;
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(2.7, 2.8, 10.6),
        new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 })
      );
      body.position.set(0, 1.8, carZ);
      const redFront = new THREE.Mesh(
        new THREE.BoxGeometry(2.74, 2.75, 1.4),
        new THREE.MeshBasicMaterial({ color: 0xdc241f })
      );
      redFront.position.set(0, 1.8, carZ + (tc === 2 ? 4.7 : tc === 0 ? -4.7 : 0));
      const blueSkirt = new THREE.Mesh(
        new THREE.BoxGeometry(2.75, 0.55, 10.6),
        new THREE.MeshBasicMaterial({ color: 0x0019a8 })
      );
      blueSkirt.position.set(0, 0.75, carZ);
      const winBand = new THREE.Mesh(
        new THREE.BoxGeometry(2.76, 0.85, 9.6),
        new THREE.MeshBasicMaterial({ color: 0xfff3b0 })
      );
      winBand.position.set(0, 2.05, carZ);
      tubeTrain.add(body, redFront, blueSkirt, winBand);
    }
    tubeTrain.position.set(53.2, 0.4, -124);
    undergroundGroup.add(tubeTrain);
    animated.tubeTrains.push({ mesh: tubeTrain, dir: 1, z: -124 });

    const tubeLight = new THREE.PointLight(0xfff4d6, 1.2, 32);
    tubeLight.position.set(42, 4.8, -124);
    undergroundGroup.add(tubeLight);

    scene.add(undergroundGroup);
    addBoxCollider(31, -134.2, 26, 0.8);
    addBoxCollider(31, -113.8, 26, 0.8);
    addBoxCollider(57.5, -124, 1.0, 26);

    // --- B. UNILEVER HOUSE (Sweeping Neoclassical curve at North-West: X = -62, Z = -140) ---
    const unileverGroup = new THREE.Group();
    const uniTex = makeBrickFacadeTexture("#dfd7c6", "#253545", 0.5, 12, 8);
    const uniMat = new THREE.MeshStandardMaterial({ map: uniTex, roughness: 0.65 });

    const uniMain = new THREE.Mesh(new THREE.BoxGeometry(58, 34, 38), uniMat);
    uniMain.position.set(-62, 23, -142);
    uniMain.rotation.y = 0.24;
    unileverGroup.add(uniMain);

    for (let i = -5; i <= 5; i++) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.05, 18, 12), matPortland);
      const angle = i * 0.08;
      col.position.set(-60 + i * 4.6, 22, -121 - Math.abs(i) * 1.1);
      col.rotation.y = angle;
      unileverGroup.add(col);
    }

    const uniCornice = new THREE.Mesh(new THREE.BoxGeometry(60, 3.2, 40), matPortland);
    uniCornice.position.set(-62, 41, -142);
    uniCornice.rotation.y = 0.24;
    unileverGroup.add(uniCornice);
    scene.add(unileverGroup);
    addBoxCollider(-62, -142, 56, 38);

    // --- C. ONE BLACKFRIARS ("THE VASE" / "THE BOOMERANG") at South-West: X = -52, Z = 152 ---
    const vaseGroup = new THREE.Group();
    const vaseSlices = 22;
    const totalVaseH = 148;
    const sliceH = totalVaseH / vaseSlices;
    for (let i = 0; i < vaseSlices; i++) {
      const t = i / (vaseSlices - 1);
      const radiusX = 13 + Math.sin(t * Math.PI * 0.92) * 9.5 - t * 3.0;
      const radiusZ = 10 + Math.sin(t * Math.PI * 0.85) * 6.5;
      const sliceGeo = new THREE.CylinderGeometry(radiusX * 0.96, radiusX, sliceH + 0.15, 20);
      const sliceMesh = new THREE.Mesh(sliceGeo, matGlassCrystalline);
      sliceMesh.scale.set(1.0, 1.0, radiusZ / radiusX);
      sliceMesh.position.set(-52 + Math.sin(t * Math.PI) * 2.8, 6 + i * sliceH + sliceH * 0.5, 152);
      sliceMesh.rotation.y = 0.35 + t * 0.22;
      vaseGroup.add(sliceMesh);
    }
    scene.add(vaseGroup);
    addBoxCollider(-52, 152, 26, 22);

    // --- D. SOUTH BANK TOWER & SEA CONTAINERS HOUSE (West of One Blackfriars) ---
    const sbTowerMat = new THREE.MeshStandardMaterial({
      map: makeBrickFacadeTexture("#1f3447", "#7cc2e8", 0.65, 10, 20),
      roughness: 0.25,
      metalness: 0.75
    });
    const sbTower = new THREE.Mesh(new THREE.BoxGeometry(28, 118, 28), sbTowerMat);
    sbTower.position.set(-118, 65, 142);
    scene.add(sbTower);
    addBoxCollider(-118, 142, 28, 28);

    const seaContainers = new THREE.Mesh(
      new THREE.BoxGeometry(74, 46, 26),
      new THREE.MeshStandardMaterial({
        map: makeBrickFacadeTexture("#d6cfc2", "#2b4257", 0.55, 14, 8),
        roughness: 0.5
      })
    );
    seaContainers.position.set(-125, 29, 106);
    scene.add(seaContainers);
    addBoxCollider(-125, 106, 74, 26);

    // --- E. OXO TOWER WHARF (Further West on South Bank: X = -215, Z = 104) ---
    const oxoBase = new THREE.Mesh(
      new THREE.BoxGeometry(44, 30, 24),
      new THREE.MeshStandardMaterial({
        map: makeBrickFacadeTexture("#8c4a38", "#f4d088", 0.6, 8, 6),
        roughness: 0.7
      })
    );
    oxoBase.position.set(-215, 21, 104);
    scene.add(oxoBase);

    const oxoTower = new THREE.Mesh(new THREE.BoxGeometry(9, 64, 9), matPortland);
    oxoTower.position.set(-215, 38, 96);
    scene.add(oxoTower);

    const oxoLightMat = new THREE.MeshBasicMaterial({ color: 0xffdf80 });
    [60, 52, 44].forEach((oy) => {
      const sign = new THREE.Mesh(new THREE.BoxGeometry(4.2, 4.2, 9.4), oxoLightMat);
      sign.position.set(-215, oy, 96);
      scene.add(sign);
    });

    // --- F. DOGGETT'S COAT & BADGE PUB (South-East Bridgehead: X = -22, Z = 105) ---
    const doggetts = new THREE.Mesh(
      new THREE.BoxGeometry(16, 22, 16),
      new THREE.MeshStandardMaterial({
        map: makeBrickFacadeTexture("#7a2e26", "#ffdfa0", 0.75, 5, 5),
        roughness: 0.7
      })
    );
    doggetts.position.set(-22, 17, 106);
    scene.add(doggetts);
    addBoxCollider(-22, 106, 16, 16);

    // --- G. TATE MODERN & MILLENNIUM BRIDGE (East on South Bank: X = +165, Z = +118) ---
    const tateBrickMat = new THREE.MeshStandardMaterial({
      map: makeBrickFacadeTexture("#5e3c2c", "#e6c387", 0.4, 14, 6),
      roughness: 0.8
    });
    const tateBody = new THREE.Mesh(new THREE.BoxGeometry(88, 34, 38), tateBrickMat);
    tateBody.position.set(165, 23, 122);
    scene.add(tateBody);

    const tateChimney = new THREE.Mesh(new THREE.BoxGeometry(10, 96, 10), tateBrickMat);
    tateChimney.position.set(165, 54, 108);
    scene.add(tateChimney);

    const tateBeacon = new THREE.Mesh(
      new THREE.BoxGeometry(10.4, 12, 10.4),
      new THREE.MeshBasicMaterial({ color: 0xfff0b3 })
    );
    tateBeacon.position.set(165, 98, 108);
    scene.add(tateBeacon);

    const milDeck = new THREE.Mesh(new THREE.BoxGeometry(5, 0.6, 180), matPortland);
    milDeck.position.set(165, 7.2, 0);
    scene.add(milDeck);
    [-40, 40].forEach((mz) => {
      const yArm = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 1.2, 18, 8), matPortland);
      yArm.position.set(165, 5, mz);
      scene.add(yArm);
    });

    // --- H. ST PAUL'S CATHEDRAL (North-East Commanding Vista: X = +165, Z = -225) ---
    const stPaulsGroup = new THREE.Group();
    const nave = new THREE.Mesh(new THREE.BoxGeometry(46, 38, 92), matPortland);
    nave.position.set(165, 25, -225);
    stPaulsGroup.add(nave);

    const drum = new THREE.Mesh(new THREE.CylinderGeometry(20, 21, 24, 24), matPortland);
    drum.position.set(165, 54, -225);
    stPaulsGroup.add(drum);

    const domeMat = new THREE.MeshStandardMaterial({ color: 0x4a5568, roughness: 0.5, metalness: 0.45 });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(19.5, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.5), domeMat);
    dome.position.set(165, 65, -225);
    stPaulsGroup.add(dome);

    const lantern = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 4.2, 14, 12), matPortland);
    lantern.position.set(165, 88, -225);
    stPaulsGroup.add(lantern);

    const crossOrb = new THREE.Mesh(new THREE.SphereGeometry(2.2, 12, 12), matGold);
    crossOrb.position.set(165, 97, -225);
    stPaulsGroup.add(crossOrb);

    [-16, 16].forEach((tz) => {
      const wTower = new THREE.Mesh(new THREE.BoxGeometry(10, 66, 10), matPortland);
      wTower.position.set(138, 39, -225 + tz);
      stPaulsGroup.add(wTower);
    });
    scene.add(stPaulsGroup);

    // --- I. REAL OPENSTREETMAP 3D BUILDING FOOTPRINTS & DISTANT SKYLINE ---
    const shard = new THREE.Mesh(new THREE.ConeGeometry(28, 285, 4), matGlassCrystalline);
    shard.position.set(340, 145, 270);
    shard.rotation.y = Math.PI * 0.25;
    scene.add(shard);

    const distantSkyscrapers = [
      { x: 310, z: -330, w: 34, h: 195, d: 34 },
      { x: 365, z: -295, w: 28, h: 165, d: 28 },
      { x: 275, z: -355, w: 30, h: 145, d: 26 }
    ];
    distantSkyscrapers.forEach((b, idx) => {
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(b.w, b.h, b.d),
        new THREE.MeshStandardMaterial({
          map: makeBrickFacadeTexture(idx % 2 === 0 ? "#243748" : "#324b61", "#7ec8e3", 0.6, 8, 16),
          roughness: 0.3,
          metalness: 0.65
        })
      );
      m.position.set(b.x, 6 + b.h * 0.5, b.z);
      scene.add(m);
    });

    // Extrude Real OpenStreetMap Building Footprints (filtering out footprints replaced by our custom walkable Vacation Buildings & alleys)
    const osmPaletteMats = [
      new THREE.MeshStandardMaterial({
        map: makeBrickFacadeTexture("#d6cbb9", "#2a3c4d", 0.48, 8, 8),
        roughness: 0.65,
        metalness: 0.12
      }),
      new THREE.MeshStandardMaterial({
        map: makeBrickFacadeTexture("#844636", "#ffdfa0", 0.55, 6, 8),
        roughness: 0.72,
        metalness: 0.08
      }),
      new THREE.MeshStandardMaterial({
        map: makeBrickFacadeTexture("#23384c", "#82c8e6", 0.62, 10, 12),
        roughness: 0.28,
        metalness: 0.65
      }),
      new THREE.MeshStandardMaterial({
        map: makeBrickFacadeTexture("#b8aa93", "#334155", 0.45, 6, 6),
        roughness: 0.7,
        metalness: 0.1
      }),
      new THREE.MeshStandardMaterial({
        map: makeBrickFacadeTexture("#515966", "#bae6fd", 0.54, 8, 10),
        roughness: 0.4,
        metalness: 0.45
      })
    ];

    osmPaletteMats.forEach((mat) => {
      if (mat.map) {
        mat.map.repeat.set(0.06, 0.06);
      }
    });

    const osmGroup = new THREE.Group();
    const osmData = window.BLACKFRIARS_OSM || { buildings: [], streets: [] };

    osmData.buildings.forEach((b, idx) => {
      if (!b.pts || b.pts.length < 3) return;
      // Keep the custom Vacation District (Premier Inn, Dorset Rise, Tesco, Sainsbury's, New Bridge St, The Black Friar & Alley Bistro) 100% clean and unobstructed
      if (b.cx > -88 && b.cx < 86 && b.cz > -348 && b.cz < -150) return;
      // Also avoid overlapping St Paul's Cathedral custom model
      if (b.cx > 125 && b.cx < 205 && b.cz > -275 && b.cz < -175) return;

      const shape = new THREE.Shape();
      shape.moveTo(b.pts[0][0], -b.pts[0][1]);
      for (let i = 1; i < b.pts.length; i++) {
        shape.lineTo(b.pts[i][0], -b.pts[i][1]);
      }
      shape.closePath();

      const extrudeH = Math.max(4, b.h - (b.minH || 0));
      const geo = new THREE.ExtrudeGeometry(shape, {
        depth: extrudeH,
        bevelEnabled: false
      });

      let mat = osmPaletteMats[idx % osmPaletteMats.length];
      if (b.type === "office" || b.h > 42) {
        mat = osmPaletteMats[2];
      } else if (b.type === "church" || b.type === "university") {
        mat = osmPaletteMats[0];
      } else if (b.type === "apartments" || b.type === "residential") {
        mat = osmPaletteMats[1];
      }

      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.y = 6.0 + (b.minH || 0);
      osmGroup.add(mesh);

      // Shrunk AABB collider so diagonal streets & pedestrian lanes are never blocked
      if ((!b.minH || b.minH < 2) && Math.abs(b.cx) < 380 && Math.abs(b.cz) < 380) {
        const margin = 1.8;
        if (b.maxX - b.minX > margin * 2 && b.maxZ - b.minZ > margin * 2) {
          colliders.push({
            minX: b.minX + margin,
            maxX: b.maxX - margin,
            minZ: b.minZ + margin,
            maxZ: b.maxZ - margin
          });
        }
      }
    });

    // Render Real OpenStreetMap Street Network Ribbons on North & South Banks
    const matOsmStreet = new THREE.MeshStandardMaterial({ color: 0x353b45, roughness: 0.88 });
    osmData.streets.forEach((st) => {
      if (!st.pts || st.pts.length < 2) return;
      const w = st.type === "primary" ? 9.0 : st.type === "secondary" || st.type === "tertiary" ? 6.5 : 3.6;
      for (let i = 0; i < st.pts.length - 1; i++) {
        const [x1, z1] = st.pts[i];
        const [x2, z2] = st.pts[i + 1];
        if (Math.abs(z1) < 94 || Math.abs(z2) < 94) continue;
        if (x1 > 14 && x1 < 58 && z1 > -136 && z1 < -112) continue;
        const dx = x2 - x1;
        const dz = z2 - z1;
        const segLen = Math.hypot(dx, dz);
        if (segLen < 1 || segLen > 180) continue;
        const seg = new THREE.Mesh(new THREE.PlaneGeometry(w, segLen + 0.6), matOsmStreet);
        seg.rotation.order = "YXZ";
        seg.rotation.x = -Math.PI / 2;
        seg.rotation.y = Math.atan2(dx, dz);
        seg.position.set((x1 + x2) * 0.5, 6.015, (z1 + z2) * 0.5);
        osmGroup.add(seg);
      }
    });

    scene.add(osmGroup);

    // ========================================================================
    // 6. BLACKFRIARS MILLENNIUM PIER, TREES, RED PHONE BOXES, POSTBOXES & BOLLARDS
    // ========================================================================
    const pierPontoon = new THREE.Mesh(new THREE.BoxGeometry(28, 1.6, 9), matPortland);
    pierPontoon.position.set(-78, 2.2, -80);
    scene.add(pierPontoon);

    const pierRoof = new THREE.Mesh(new THREE.BoxGeometry(20, 0.5, 7), matIronDark);
    pierRoof.position.set(-78, 6.0, -80);
    scene.add(pierRoof);

    const gangway = new THREE.Mesh(new THREE.BoxGeometry(14, 0.5, 4.2), matIronDark);
    gangway.position.set(-68, 4.5, -86);
    gangway.rotation.z = 0.24;
    scene.add(gangway);

    // London Plane Trees along South Bank, Victoria Embankment, New Bridge St & Dorset Rise
    const treeCoords = [
      [-32, 95], [-48, 95], [-66, 95], [-84, 95], [-104, 95],
      [-35, -95], [-55, -95], [-95, -95], [-115, -95],
      [18, -118], [-22, -118], [-15, -245], [16, -250], [-36, -293], [-36, -309]
    ];
    treeCoords.forEach(([tx, tz]) => {
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.26, 0.4, 4.4, 8),
        new THREE.MeshStandardMaterial({ color: 0x4a3728, roughness: 0.9 })
      );
      trunk.position.set(tx, 8.2, tz);
      const crown = new THREE.Mesh(new THREE.DodecahedronGeometry(2.9, 1), matParkGrass);
      crown.position.set(tx, 11.4, tz);
      scene.add(trunk, crown);
    });

    // Iconic Red K6 London Telephone Boxes & Royal Mail Pillar Postboxes
    const matRedBooth = new THREE.MeshStandardMaterial({ color: 0xc81e1e, roughness: 0.35, metalness: 0.15 });
    [
      [14, -118],
      [-15.5, 98],
      [34.5, -214.5],
      [-14.2, -267.5]
    ].forEach(([kx, kz]) => {
      const booth = new THREE.Mesh(new THREE.BoxGeometry(1.05, 2.55, 1.05), matRedBooth);
      booth.position.set(kx, 7.28, kz);
      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.68, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.45), matRedBooth);
      dome.position.set(kx, 8.45, kz);
      scene.add(booth, dome);
    });

    // Royal Mail Red Pillar Postboxes outside Tesco Express & The Black Friar
    [
      [-14.2, -288.5],
      [35.2, -234.5]
    ].forEach(([px, pz]) => {
      const postbox = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.34, 1.55, 12), matRedBooth);
      postbox.position.set(px, 6.78, pz);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.14, 12), matIronDark);
      cap.position.set(px, 7.58, pz);
      scene.add(postbox, cap);
    });

    // ========================================================================
    // 7. ANIMATED THAMES CLIPPERS, DOUBLE-DECKER BUSES, BLACK CABS, PEDESTRIANS & GULLS
    // ========================================================================
    const boatPositions = [
      { x: -160, z: -36, dir: 1, speed: 9.5 },
      { x: 140, z: 36, dir: -1, speed: 8.2 }
    ];
    boatPositions.forEach((bp) => {
      const boat = new THREE.Group();
      const hull = new THREE.Mesh(
        new THREE.BoxGeometry(18, 1.8, 5.2),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.35 })
      );
      hull.position.y = 0.8;
      const cabin = new THREE.Mesh(
        new THREE.BoxGeometry(12, 2.0, 4.4),
        new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.25 })
      );
      cabin.position.set(-1 * bp.dir, 2.3, 0);
      const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(14, 0.45, 4.6),
        new THREE.MeshBasicMaterial({ color: 0xef4444 })
      );
      stripe.position.set(0, 1.6, 0);
      const wake = new THREE.Mesh(
        new THREE.PlaneGeometry(14, 4.4),
        new THREE.MeshBasicMaterial({ color: 0xe0f2fe, transparent: true, opacity: 0.42 })
      );
      wake.rotation.x = -Math.PI / 2;
      wake.position.set(-15 * bp.dir, 0.15, 0);
      boat.add(hull, cabin, stripe, wake);
      boat.position.set(bp.x, 0.2, bp.z);
      scene.add(boat);
      animated.boats.push({ mesh: boat, dir: bp.dir, speed: bp.speed });
    });

    // Red London Double-Decker Routemaster Buses crossing Blackfriars Bridge & New Bridge Street
    const busConfigs = [
      { x: -7.5, z: -180, dir: 1, speed: 12.5 },
      { x: -1.5, z: 140, dir: -1, speed: 11.5 },
      { x: -7.5, z: 40, dir: 1, speed: 12.0 }
    ];
    busConfigs.forEach((bc) => {
      const bus = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(2.65, 4.1, 9.6),
        new THREE.MeshStandardMaterial({ color: 0xd92323, roughness: 0.32 })
      );
      body.position.y = 2.35;
      const upperWin = new THREE.Mesh(
        new THREE.BoxGeometry(2.72, 1.1, 8.8),
        new THREE.MeshBasicMaterial({ color: 0xffe8a3 })
      );
      upperWin.position.y = 3.45;
      const lowerWin = new THREE.Mesh(
        new THREE.BoxGeometry(2.72, 1.0, 7.6),
        new THREE.MeshBasicMaterial({ color: 0xffe8a3 })
      );
      lowerWin.position.y = 1.65;
      bus.add(body, upperWin, lowerWin);
      bus.position.set(bc.x, 6.0, bc.z);
      scene.add(bus);
      animated.buses.push({ mesh: bus, dir: bc.dir, speed: bc.speed, laneX: bc.x });
    });

    // Iconic London Black Cabs (Hackney Carriages) with glowing yellow "TAXI" roof signs
    const taxiConfigs = [
      { x: -1.8, z: -260, dir: -1, speed: 14.5 },
      { x: -7.2, z: -60, dir: 1, speed: 13.8 },
      { x: -1.8, z: 20, dir: -1, speed: 14.0 }
    ];
    const matTaxiBlack = new THREE.MeshStandardMaterial({ color: 0x111318, roughness: 0.2, metalness: 0.6 });
    taxiConfigs.forEach((tc) => {
      const taxi = new THREE.Group();
      const lower = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.85, 4.4), matTaxiBlack);
      lower.position.y = 0.65;
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.8, 2.5), matTaxiBlack);
      cabin.position.set(0, 1.4, -0.2);
      const taxiSign = new THREE.Mesh(
        new THREE.BoxGeometry(0.65, 0.22, 0.25),
        new THREE.MeshBasicMaterial({ color: 0xffb300 })
      );
      taxiSign.position.set(0, 1.9, 0.8 * tc.dir);
      taxi.add(lower, cabin, taxiSign);
      taxi.position.set(tc.x, 6.0, tc.z);
      scene.add(taxi);
      animated.taxis.push({ mesh: taxi, dir: tc.dir, speed: tc.speed });
    });

    // Strolling London Pedestrians (some carrying Tesco blue or Sainsbury's orange shopping bags!)
    const pedConfigs = [
      { x: -11.5, zStart: -265, zEnd: -330, speed: 1.9, coat: 0x334155, bag: 0x00539f }, // New Bridge St West (Tesco/Sainsbury's shopper)
      { x: -11.0, zStart: -325, zEnd: -255, speed: 1.75, coat: 0x7c2d12, bag: 0xf06c00 }, // Sainsbury's shopper walking back toward Dorset Rise
      { x: -28.0, zStart: -304, zEnd: -298, speed: 1.4, coat: 0x4c1d57, bag: 0xfacc15 }, // Dorset Rise outside Premier Inn
      { x: 59.5, zStart: -225, zEnd: -268, speed: 1.5, coat: 0x1e3a8a, bag: null }, // Walking into Blackfriars Lane alley behind the pub
      { x: -12.0, zStart: -70, zEnd: 70, speed: 2.0, coat: 0x3f3f46, bag: null }, // Crossing Blackfriars Bridge West sidewalk
      { x: 3.2, zStart: 65, zEnd: -65, speed: 1.85, coat: 0x581c87, bag: 0xf06c00 } // Crossing Blackfriars Bridge East sidewalk
    ];
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xf1c27d, roughness: 0.7 });
    pedConfigs.forEach((pc, idx) => {
      const ped = new THREE.Group();
      const torso = new THREE.Mesh(
        new THREE.BoxGeometry(0.46, 0.72, 0.28),
        new THREE.MeshStandardMaterial({ color: pc.coat, roughness: 0.75 })
      );
      torso.position.y = 1.1;
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 10), skinMat);
      head.position.y = 1.65;
      const legL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.7, 0.18), matIronDark);
      legL.position.set(-0.12, 0.38, 0);
      const legR = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.7, 0.18), matIronDark);
      legR.position.set(0.12, 0.38, 0);
      ped.add(torso, head, legL, legR);

      if (pc.bag !== null) {
        const bagMesh = new THREE.Mesh(
          new THREE.BoxGeometry(0.12, 0.36, 0.32),
          new THREE.MeshBasicMaterial({ color: pc.bag })
        );
        bagMesh.position.set(0.32, 0.72, 0);
        ped.add(bagMesh);
      }

      ped.position.set(pc.x, 6.0, pc.zStart);
      scene.add(ped);
      animated.pedestrians.push({
        mesh: ped,
        legL,
        legR,
        x: pc.x,
        z: pc.zStart,
        zMin: Math.min(pc.zStart, pc.zEnd),
        zMax: Math.max(pc.zStart, pc.zEnd),
        dir: pc.zEnd > pc.zStart ? 1 : -1,
        speed: pc.speed,
        phase: idx * 1.3
      });
    });

    // Wheeling White Thames Seagulls above Blackfriars Bridge & 1864 Columns
    const gullMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc, side: THREE.DoubleSide });
    for (let g = 0; g < 8; g++) {
      const gull = new THREE.Group();
      const wingL = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.28), gullMat);
      wingL.position.x = -0.45;
      const wingR = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.28), gullMat);
      wingR.position.x = 0.45;
      gull.add(wingL, wingR);
      scene.add(gull);
      animated.gulls.push({
        mesh: gull,
        wingL,
        wingR,
        cx: -15 + (g % 4) * 18,
        cz: -35 + Math.floor(g / 4) * 65,
        radius: 18 + g * 3.5,
        y: 22 + (g % 3) * 5,
        speed: 0.45 + (g % 3) * 0.12,
        phase: g * 0.9
      });
    }

    // ========================================================================
    // 8. HERITAGE & VACATION MEMORY PLAQUE PEDESTALS
    // ========================================================================
    LANDMARKS.forEach((lm, index) => {
      const pGroup = new THREE.Group();
      const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.48, 1.35, 12), matIronDark);
      ped.position.y = -0.5;
      pGroup.add(ped);

      const discColor = lm.isVacation ? 0x9333ea : 0x1d4ed8;
      const discEmissive = lm.isVacation ? 0x4c1d95 : 0x0f296b;
      const disc = new THREE.Mesh(
        new THREE.CylinderGeometry(0.54, 0.54, 0.12, 20),
        new THREE.MeshStandardMaterial({ color: discColor, roughness: 0.25, metalness: 0.45, emissive: discEmissive })
      );
      disc.rotation.x = Math.PI * 0.32;
      disc.position.y = 0.25;
      pGroup.add(disc);

      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.64, 0.06, 10, 24), matGold);
      ring.position.y = 0.95;
      pGroup.add(ring);

      pGroup.position.set(lm.plaquePos.x, lm.plaquePos.y, lm.plaquePos.z);
      pGroup.userData = { landmarkIndex: index, landmark: lm };
      scene.add(pGroup);

      plaqueMeshes.push(pGroup);
      animated.beaconMeshes.push(ring);
    });

    // Ground height helper for smooth pedestrian walking on bridges, ramps, piers & embankments
    function getFloorHeight(x, z) {
      // 1. Blackfriars Road Bridge (X between -13.8 and +4.8, Z between -90 and +90)
      if (x >= -13.8 && x <= 4.8 && z >= -90 && z <= 90) {
        const normZ = z / 90;
        return 6.0 + 2.6 * (1 - normZ * normZ);
      }
      // 2. Old 1864 Columns Observation Spur (walkable bridge-side balcony at Z = -48, X = 4.5 to 9.5)
      if (x >= 4.5 && x <= 9.5 && z >= -52 && z <= -44) {
        return 7.85;
      }
      // 3. Blackfriars Solar Railway Station Deck (X between 23 and 47, Z between -96 and +96)
      if (x >= 23 && x <= 47 && z >= -96 && z <= 96) {
        return 7.4;
      }
      // North & South Station Access Ramps (X between 28 and 42, Z in [-112, -96] or [96, 112])
      if (x >= 28 && x <= 42 && z >= -112 && z < -96) {
        const t = (z + 112) / 16; // 0 at street (-112), 1 at station (-96)
        return 6.0 + t * 1.4;
      }
      if (x >= 28 && x <= 42 && z > 96 && z <= 112) {
        const t = (112 - z) / 16;
        return 6.0 + t * 1.4;
      }
      // 3b. Blackfriars Underground Station Stairwell & Subsurface Concourse (X in [18, 57], Z in [-134, -114])
      if (x >= 18 && x <= 57 && z >= -134 && z <= -114) {
        if (x < 32) {
          const t = (x - 18) / 14;
          return 6.0 - t * 4.8;
        }
        return 1.2;
      }
      // 4. Blackfriars Millennium Pier & Gangway (X in [-92, -62], Z in [-90, -75])
      if (x >= -92 && x <= -60 && z >= -90 && z <= -75) {
        if (x > -72) {
          const t = Math.max(0, Math.min(1, (-60 - x) / 12));
          return 6.0 - t * 3.0;
        }
        return 3.0;
      }
      // 5. Millennium Footbridge (X in [162, 168], Z in [-90, 90])
      if (x >= 162 && x <= 168 && z >= -90 && z <= 90) {
        return 7.5;
      }
      // 6. North & South Embankment Land (|Z| >= 90)
      if (z <= -90 || z >= 90) {
        return 6.0;
      }
      // 7. River Thames surface fallback (if player hops into river, keep floating walk on river skiff level)
      return 1.2;
    }

    function getSurfaceType(x, z) {
      // Walkable Interiors
      if (x >= -67.5 && x <= -46 && z >= -317.5 && z <= -284.5) return "interior"; // Premier Inn
      if (x >= -32 && x <= -15 && z >= -290 && z <= -270) return "interior"; // Tesco Express
      if (x >= -32 && x <= -15 && z >= -332 && z <= -312) return "interior"; // Sainsbury's Local
      if (x >= 37 && x <= 57 && z >= -238 && z <= -216) return "interior"; // The Black Friar Pub
      if (x >= 43 && x <= 57 && z >= -275 && z <= -253) return "interior"; // Alley Bistro
      // Historic Cobblestones in Blackfriars Lane & Playhouse Yard behind the pub
      if (x >= 39 && x <= 73 && z >= -285 && z <= -238) return "cobble";
      if (Math.abs(z) < 90) return "bridge";
      return "stone";
    }

    function getZoneName(x, z) {
      // 1. Premier Inn London Blackfriars (Dorset Rise)
      if (x >= -68 && x <= -45.5 && z >= -318 && z <= -284) {
        if (z < -305) return "PREMIER INN BLACKFRIARS — THYME BAR & BREAKFAST ROOM";
        if (z > -296) return "PREMIER INN BLACKFRIARS — GUEST ROOM 312 (HYPNOS BED)";
        return "PREMIER INN LONDON BLACKFRIARS — RECEPTION & LOBBY";
      }
      if (x >= -46 && x <= -14 && z >= -310 && z <= -292) {
        return "DORSET RISE EC4Y — APPROACH TO PREMIER INN";
      }
      // 2. Tesco Express (20-21 New Bridge St)
      if (x >= -32.5 && x <= -14.8 && z >= -290.5 && z <= -269.5) {
        return "TESCO EXPRESS — 20–21 NEW BRIDGE STREET (MEAL DEAL AISLES)";
      }
      // 3. Sainsbury's Local (26-27 New Bridge St)
      if (x >= -32.5 && x <= -14.8 && z >= -332.5 && z <= -311.5) {
        return "SAINSBURY'S LOCAL — 26–27 NEW BRIDGE STREET (FRESH BAKERY)";
      }
      // 4. The Black Friar Pub (174 Queen Victoria St)
      if (x >= 36.5 && x <= 57.5 && z >= -238.5 && z <= -215.5) {
        return "THE BLACK FRIAR PUB (1875/1905) — MARBLE SALOON & SNUG";
      }
      // 5. The Alley Behind the Pub & Little Alleyway Restaurant
      if (x >= 42.5 && x <= 57.5 && z >= -275.5 && z <= -252.5) {
        return "LA PETITE COUR — ALLEYWAY BISTRO DINING ROOM";
      }
      if (x >= 39 && x <= 72 && z >= -285 && z <= -238) {
        return "BLACKFRIARS LANE & PLAYHOUSE YARD — SECRET ALLEY BEHIND THE PUB";
      }
      if (x >= 18 && x <= 57 && z >= -134 && z <= -114) {
        return x >= 31
          ? "BLACKFRIARS UNDERGROUND — DISTRICT & CIRCLE LINE CONCOURSE"
          : "BLACKFRIARS UNDERGROUND STATION — ENTRANCE HALL";
      }
      if (x >= -14 && x <= 5 && Math.abs(z) <= 90) {
        return "BLACKFRIARS ROAD BRIDGE (1869)";
      }
      if (x >= 23 && x <= 47 && Math.abs(z) <= 105) {
        return "BLACKFRIARS SOLAR RAILWAY STATION";
      }
      if (x <= -60 && z >= -92 && z <= -74) {
        return "BLACKFRIARS MILLENNIUM PIER";
      }
      if (z < -90) {
        if (x > 16) return "QUEEN VICTORIA ST & THE BLACK FRIAR";
        if (x < -25 && z > -200) return "VICTORIA EMBANKMENT & UNILEVER HOUSE";
        return "NEW BRIDGE STREET EC4V — VACATION PROMENADE";
      }
      if (z > 90) {
        if (x < -25) return "SOUTH BANK PROMENADE & ONE BLACKFRIARS";
        if (x > 60) return "BANKSIDE & TATE MODERN REACH";
        return "BLACKFRIARS ROAD — SOUTH BRIDGEHEAD";
      }
      return "RIVER THAMES — BLACKFRIARS REACH";
    }

    function setSkyTheme(preset) {
      if (!animated.skyMat || !preset) return;
      const u = animated.skyMat.uniforms;
      u.uTopColor.value.setHex(preset.skyTop || preset.sky);
      u.uHorizonColor.value.setHex(preset.skyHorizon || preset.fog);
      u.uBottomColor.value.setHex(preset.hemiGround || 0x1a2230);
      u.uSunColor.value.setHex(preset.sunColor || 0xffb46b);
      if (preset.sunPos) {
        u.uSunDir.value.set(preset.sunPos[0], preset.sunPos[1], preset.sunPos[2]).normalize();
      }
      u.uStarIntensity.value = preset.starIntensity !== undefined ? preset.starIntensity : 0.2;
    }

    function setRain(active) {
      if (animated.rainSystem) {
        animated.rainSystem.visible = !!active;
      }
      // Wet glossy London pavements when drizzle is active
      animated.pavingMats.forEach((m) => {
        m.roughness = active ? 0.24 : 0.78;
        m.metalness = active ? 0.35 : 0.08;
      });
    }

    function updateAnimations(dt, elapsed, playerPos) {
      // Sky shader cloud drift & star twinkle
      if (animated.skyMat) {
        animated.skyMat.uniforms.uTime.value = elapsed;
      }

      // River Thames multi-wave vertex ripple & specular shimmer
      if (animated.waterMesh) {
        animated.waterMesh.material.roughness = 0.14 + Math.sin(elapsed * 1.9) * 0.03;
        const posAttr = animated.waterMesh.geometry.attributes.position;
        if (posAttr) {
          for (let i = 0; i < posAttr.count; i++) {
            const wx = posAttr.getX(i);
            const wz = posAttr.getZ(i);
            const wave =
              Math.sin(wx * 0.06 + elapsed * 1.8) * 0.14 +
              Math.cos(wz * 0.09 - elapsed * 1.4) * 0.1;
            posAttr.setY(i, wave);
          }
          posAttr.needsUpdate = true;
        }
      }

      // River Clippers cruising along the Thames
      animated.boats.forEach((b) => {
        b.mesh.position.x += b.dir * b.speed * dt;
        b.mesh.position.y = 0.22 + Math.sin(elapsed * 2.2 + b.mesh.position.x * 0.05) * 0.12;
        if (b.dir > 0 && b.mesh.position.x > 260) b.mesh.position.x = -260;
        if (b.dir < 0 && b.mesh.position.x < -260) b.mesh.position.x = 260;
      });

      // Red Double-Decker Buses crossing Blackfriars Bridge & New Bridge Street (Z: -360 to +210)
      animated.buses.forEach((bus) => {
        bus.mesh.position.z += bus.dir * bus.speed * dt;
        if (bus.dir > 0 && bus.mesh.position.z > 210) bus.mesh.position.z = -355;
        if (bus.dir < 0 && bus.mesh.position.z < -355) bus.mesh.position.z = 210;
        const bz = bus.mesh.position.z;
        if (Math.abs(bz) <= 90) {
          const normZ = bz / 90;
          bus.mesh.position.y = 6.0 + 2.6 * (1 - normZ * normZ);
        } else {
          bus.mesh.position.y = 6.0;
        }
      });

      // London Black Cabs cruising along New Bridge Street & Blackfriars Bridge
      animated.taxis.forEach((tx) => {
        tx.mesh.position.z += tx.dir * tx.speed * dt;
        if (tx.dir > 0 && tx.mesh.position.z > 210) tx.mesh.position.z = -355;
        if (tx.dir < 0 && tx.mesh.position.z < -355) tx.mesh.position.z = 210;
        const tz = tx.mesh.position.z;
        if (Math.abs(tz) <= 90) {
          const normZ = tz / 90;
          tx.mesh.position.y = 6.0 + 2.6 * (1 - normZ * normZ);
        } else {
          tx.mesh.position.y = 6.0;
        }
      });

      // Strolling Pedestrians with articulated leg swing
      animated.pedestrians.forEach((p) => {
        p.z += p.dir * p.speed * dt;
        if (p.z > p.zMax) {
          p.z = p.zMax;
          p.dir = -1;
        } else if (p.z < p.zMin) {
          p.z = p.zMin;
          p.dir = 1;
        }
        const py = getFloorHeight(p.x, p.z);
        p.mesh.position.set(p.x, py, p.z);
        p.mesh.rotation.y = p.dir > 0 ? 0 : Math.PI;
        const swing = Math.sin(elapsed * p.speed * 4.2 + p.phase) * 0.42;
        p.legL.rotation.x = swing;
        p.legR.rotation.x = -swing;
      });

      // Wheeling White Thames Seagulls
      animated.gulls.forEach((g) => {
        const ang = elapsed * g.speed + g.phase;
        const gx = g.cx + Math.cos(ang) * g.radius;
        const gz = g.cz + Math.sin(ang) * g.radius;
        const gy = g.y + Math.sin(elapsed * 1.5 + g.phase) * 1.6;
        g.mesh.position.set(gx, gy, gz);
        g.mesh.rotation.y = -ang;
        const flap = Math.sin(elapsed * 7.5 + g.phase) * 0.38;
        g.wingL.rotation.z = flap;
        g.wingR.rotation.z = -flap;
      });

      // Flashing Amber Belisha Beacons at Zebra Crossings
      const belishaPulse = 0.55 + 0.45 * Math.sin(elapsed * 5.2);
      animated.belishaGlobes.forEach((gl) => {
        gl.scale.setScalar(0.92 + belishaPulse * 0.16);
      });

      // Gentle London Rain / Drizzle around Player
      if (animated.rainSystem && animated.rainSystem.visible) {
        const cx = playerPos ? playerPos.x : 0;
        const cz = playerPos ? playerPos.z : -200;
        animated.rainSystem.position.set(cx, 0, cz);
        const rAttr = animated.rainSystem.geometry.attributes.position;
        for (let i = 0; i < rAttr.count; i++) {
          let ry = rAttr.getY(i) - 24 * dt;
          if (ry < 4.5) ry = 54;
          rAttr.setY(i, ry);
        }
        rAttr.needsUpdate = true;
      }

      // Thameslink Train gliding through Blackfriars Station
      animated.trains.forEach((tr) => {
        tr.z += tr.dir * 6.5 * dt;
        if (tr.z > 32) tr.dir = -1;
        if (tr.z < -32) tr.dir = 1;
        tr.mesh.position.z = tr.z;
      });

      // London Underground S-Stock Tube Train gliding through subsurface platform
      animated.tubeTrains.forEach((tt) => {
        tt.z += tt.dir * 7.5 * dt;
        if (tt.z > -110) tt.dir = -1;
        if (tt.z < -138) tt.dir = 1;
        tt.mesh.position.z = tt.z;
      });

      // Rotating golden heritage plaque rings
      animated.beaconMeshes.forEach((ring, i) => {
        ring.rotation.y = elapsed * 1.8 + i;
        ring.position.y = 0.95 + Math.sin(elapsed * 2.6 + i) * 0.12;
      });
    }

    function getNearestOsmFeature(x, z) {
      // Check our 5 custom Vacation spots first so the HUD street/building readout feels hyper-authentic
      if (Math.hypot(x - (-57), z - (-301)) < 26) {
        return { building: "Premier Inn London Blackfriars (26m)", street: "Dorset Rise EC4Y" };
      }
      if (Math.hypot(x - (-23.5), z - (-280)) < 20) {
        return { building: "Tesco Express 20–21 New Bridge St", street: "New Bridge Street EC4V" };
      }
      if (Math.hypot(x - (-23.5), z - (-322)) < 20) {
        return { building: "Sainsbury's Local 26–27 New Bridge St", street: "New Bridge Street EC4V" };
      }
      if (Math.hypot(x - 47, z - (-227)) < 22) {
        return { building: "The Black Friar Pub (174 Queen Victoria St)", street: "Queen Victoria Street EC4V" };
      }
      if (Math.hypot(x - 52, z - (-260)) < 24) {
        return { building: "La Petite Cour — Alleyway Bistro", street: "Blackfriars Lane / Playhouse Yard" };
      }

      let bestBuilding = null;
      let bestBldgDist = 110;
      for (let i = 0; i < osmData.buildings.length; i++) {
        const b = osmData.buildings[i];
        if (!b.name) continue;
        const d = Math.hypot(x - b.cx, z - b.cz);
        if (d < bestBldgDist) {
          bestBldgDist = d;
          bestBuilding = b;
        }
      }

      let bestStreet = null;
      let bestStDist = 65;
      for (let i = 0; i < osmData.streets.length; i++) {
        const st = osmData.streets[i];
        if (!st.name || !st.pts.length) continue;
        const mid = st.pts[Math.floor(st.pts.length / 2)];
        const d = Math.hypot(x - mid[0], z - mid[1]);
        if (d < bestStDist) {
          bestStDist = d;
          bestStreet = st.name;
        }
      }

      return {
        building: bestBuilding ? `${bestBuilding.name} (${Math.round(bestBuilding.h)}m)` : null,
        street: bestStreet
      };
    }

    return {
      LANDMARKS,
      colliders,
      plaqueMeshes,
      osmData,
      getFloorHeight,
      getSurfaceType,
      getZoneName,
      getNearestOsmFeature,
      setSkyTheme,
      setRain,
      updateAnimations
    };
  }

  return { build };
})();
