// Japanese for the fan pulse's answer options, for the IP owner's audience view. Client-safe.

const JA: Record<string, string> = {
  // what fans would buy
  tshirt: "Tシャツ", poster: "ポスター", hoodie: "パーカー", glassware: "チャイグラス", stickers: "ステッカーシート", pin: "ピンバッジ", tote: "トートバッグ", figure: "フィギュア",
  // where they watch and discover
  crunchyroll: "Crunchyroll", netflix: "Netflix", youtube: "YouTube", reels: "Instagramリール", discord: "Discordの同時視聴会", friends: "友人・サークル",
  // language they watch in
  ja_en: "日本語（英語字幕）", hi: "ヒンディー語吹替", en: "英語吹替", ta: "タミル語吹替", te: "テルグ語吹替", other: "その他の言語",
  // age bands
  "Under 18": "18歳未満", "18–24": "18〜24歳", "25–34": "25〜34歳", "35+": "35歳以上",
  // regions of India
  North: "北部", West: "西部", South: "南部", East: "東部", Northeast: "北東部", Central: "中部",
};

/** Japanese label for a pulse option id or label, falling back to the English. */
export const pulseJa = (idOrLabel: string, fallback = idOrLabel) => JA[idOrLabel] ?? fallback;
