/**
 * Calculates a premium, transparent Digital Footprint Score out of 100 points
 * along with detailed explanations and prioritizations.
 * 
 * Score breakdown:
 * - Website Presence: Max 20 Points
 * - Google Business Profile: Max 20 Points
 * - Reviews & Reputation: Max 20 Points
 * - Social Presence: Max 15 Points
 * - Business Information Completeness: Max 15 Points
 * - Local Citations: Max 10 Points
 * 
 * Total = 100 Points
 */
export function computeLeadScore(data) {
  const breakdown = {
    websitePresence: { score: 0, max: 20, reason: "", recommendation: "", expectedImprovement: "" },
    googleBusinessProfile: { score: 0, max: 20, reason: "", recommendation: "", expectedImprovement: "" },
    reviews: { score: 0, max: 20, reason: "", recommendation: "", expectedImprovement: "" },
    socialPresence: { score: 0, max: 15, reason: "", recommendation: "", expectedImprovement: "" },
    businessInfo: { score: 0, max: 15, reason: "", recommendation: "", expectedImprovement: "" },
    citations: { score: 0, max: 10, reason: "", recommendation: "", expectedImprovement: "" }
  };

  // 1. Website Presence (Max 20 Points)
  if (!data.website) {
    breakdown.websitePresence = {
      score: 0,
      max: 20,
      reason: "No website portal detected.",
      recommendation: "Build a responsive, fast-loading, mobile-friendly website to secure organic traffic.",
      expectedImprovement: "+20 Points. Creates a central hub for web searches and lead conversions."
    };
  } else {
    let score = 10; // Base score for having website
    const speed = (data.pageSpeed && typeof data.pageSpeed.performance === "number") ? data.pageSpeed.performance : 50;
    const seo = (data.pageSpeed && typeof data.pageSpeed.seo === "number") ? data.pageSpeed.seo : 50;

    // Speed bonus (max 5)
    let speedBonus = 0;
    if (speed >= 80) speedBonus = 5;
    else if (speed >= 50) speedBonus = 3;
    else speedBonus = 1;

    // SEO bonus (max 5)
    let seoBonus = 0;
    if (seo >= 80) seoBonus = 5;
    else if (seo >= 50) seoBonus = 3;
    else seoBonus = 1;

    score += (speedBonus + seoBonus);
    score = Math.min(score, 20);

    let rec = "Maintain current website optimizations.";
    if (speed < 70) {
      rec = "Compress images, minimize JavaScript, and utilize a CDN to accelerate mobile rendering.";
    } else if (seo < 75) {
      rec = "Optimize title tags, meta descriptions, and heading structure to boost SEO visibility.";
    }

    breakdown.websitePresence = {
      score,
      max: 20,
      reason: `Website is active with a Performance score of ${speed}/100 and SEO score of ${seo}/100.`,
      recommendation: rec,
      expectedImprovement: `+${20 - score} Points by resolving detected pagespeed bottlenecks and optimizing metadata.`
    };
  }

  // 2. Google Business Profile (Max 20 Points)
  const ratingVal = data.rating !== undefined && data.rating !== null ? Number(data.rating) : 0;
  const hasGbp = ratingVal > 0 || (data.reviewsCount && data.reviewsCount > 0);

  if (!hasGbp) {
    breakdown.googleBusinessProfile = {
      score: 0,
      max: 20,
      reason: "No Google Business Profile detected or profile is completely unoptimized.",
      recommendation: "Claim and verify your Google Business Profile, and complete all profile sections.",
      expectedImprovement: "+20 Points. Dramatically improves placement in local Maps searches."
    };
  } else {
    let score = 10; // Base for profile existence
    
    // Verified status (assumed verified if has reviews & description, or if explicitly passed)
    const isVerified = data.verifiedStatus === "Verified" || (ratingVal > 4.0 && data.reviewsCount > 5);
    if (isVerified) score += 5;

    // Profile completeness
    let completenessScore = 0;
    if (data.photosCount && data.photosCount > 10) completenessScore += 2.5;
    else if (data.photosCount && data.photosCount > 0) completenessScore += 1.5;
    if (data.description && data.description !== "N/A" && data.description.length > 20) completenessScore += 2.5;
    
    score += completenessScore;
    score = Math.min(Math.round(score), 20);

    breakdown.googleBusinessProfile = {
      score,
      max: 20,
      reason: isVerified 
        ? `Verified Google Business Profile active with ${data.photosCount || 0} photos.`
        : `Google Business Profile detected but appears unverified/unoptimized.`,
      recommendation: score < 18 
        ? "Add high-resolution photos of your services, write a detailed business description, and post weekly updates."
        : "Regularly update business photos and respond to reviews within 24 hours.",
      expectedImprovement: `+${20 - score} Points. Building GBP completeness reinforces local search authority.`
    };
  }

  // 3. Reviews & Reputation (Max 20 Points)
  if (ratingVal === 0) {
    breakdown.reviews = {
      score: 0,
      max: 20,
      reason: "No reviews or rating score detected on Google Maps.",
      recommendation: "Implement an automated review generation strategy via email/SMS.",
      expectedImprovement: "+20 Points. Generates social proof and signals trust to search algorithms."
    };
  } else {
    let ratingScore = 0;
    if (ratingVal >= 4.5) ratingScore = 10;
    else if (ratingVal >= 4.0) ratingScore = 7;
    else if (ratingVal >= 3.5) ratingScore = 4;
    else ratingScore = 1;

    const reviewsCount = Number(data.reviewsCount) || 0;
    let countScore = 0;
    if (reviewsCount >= 100) countScore = 10;
    else if (reviewsCount >= 50) countScore = 8;
    else if (reviewsCount >= 10) countScore = 5;
    else if (reviewsCount >= 1) countScore = 2;

    const score = ratingScore + countScore;

    breakdown.reviews = {
      score,
      max: 20,
      reason: `Business has a ${ratingVal}★ rating based on ${reviewsCount} Google reviews.`,
      recommendation: ratingVal < 4.2 
        ? "Improve customer service standards and target happy customers for new review requests to dilute negative feedback."
        : "Integrate a Google review link in customer follow-up messages to scale review volume.",
      expectedImprovement: `+${20 - score} Points. Expanding review quantity and average star rating boosts search placements.`
    };
  }

  // 4. Social Presence (Max 15 Points)
  let detectedPlatformsCount = 0;
  const sp = data.socialPresence || {};
  if (sp.facebook && sp.facebook !== "N/A" && !sp.facebook.includes("null")) detectedPlatformsCount++;
  if (sp.instagram && sp.instagram !== "N/A" && !sp.instagram.includes("null")) detectedPlatformsCount++;
  if (sp.linkedin && sp.linkedin !== "N/A" && !sp.linkedin.includes("null")) detectedPlatformsCount++;
  if (sp.twitter && sp.twitter !== "N/A" && !sp.twitter.includes("null")) detectedPlatformsCount++;
  if (sp.youtube && sp.youtube !== "N/A" && !sp.youtube.includes("null")) detectedPlatformsCount++;

  const socialScore = Math.min(detectedPlatformsCount * 3, 15);
  breakdown.socialPresence = {
    score: socialScore,
    max: 15,
    reason: detectedPlatformsCount > 0 
      ? `Detected ${detectedPlatformsCount} active social media profile(s).` 
      : "No active social media platforms detected.",
    recommendation: socialScore < 9 
      ? "Establish profiles on missing key platforms (Facebook, Instagram) and post consistent branding content."
      : "Automate social content posting frequency and incorporate calls-to-action.",
    expectedImprovement: `+${15 - socialScore} Points. Broadening social handles drives multi-channel authority and brand trust.`
  };

  // 5. Business Information Completeness (Max 15 Points)
  let fieldsCount = 0;
  if (data.name) fieldsCount++;
  if (data.category && data.category !== "N/A") fieldsCount++;
  if (data.address && data.address !== "Address N/A") fieldsCount++;
  if (data.phoneNumber && data.phoneNumber !== "N/A") fieldsCount++;
  if (data.email && data.email !== "N/A") fieldsCount++;
  if (data.website) fieldsCount++;
  if (data.openingHours && data.openingHours !== "N/A") fieldsCount++;
  if (data.latitude) fieldsCount++;
  if (data.longitude) fieldsCount++;
  if (data.googleMapsLink && data.googleMapsLink !== "N/A") fieldsCount++;

  const infoScore = Math.min(Math.round(fieldsCount * 1.5), 15);
  breakdown.businessInfo = {
    score: infoScore,
    max: 15,
    reason: `Provided directory details contain ${fieldsCount} out of 10 primary parameters.`,
    recommendation: infoScore < 15 
      ? "Fill in missing information (such as email, opening hours, or coordinates) in business directory citations."
      : "Verify accuracy of hours and listings quarterly to prevent customer frustration.",
    expectedImprovement: `+${15 - infoScore} Points. Complete listings maximize conversions and citation consistency scores.`
  };

  // 6. Local Citations (Max 10 Points)
  // Check if coordinates exist or if listed as OSM center
  const hasOsm = data.latitude && data.longitude;
  const citationScore = hasOsm ? 10 : 3;

  breakdown.citations = {
    score: citationScore,
    max: 10,
    reason: hasOsm 
      ? "Listed in OpenStreetMap and geocoded properly on local map frameworks."
      : "Listing missing geographical coordinates or directory validation.",
    recommendation: !hasOsm 
      ? "Publish company listings in major local directory engines (Apple Maps, Yelp, OSM, Bing)."
      : "Audit existing business citations to fix matching name, address, and phone inconsistencies.",
    expectedImprovement: `+${10 - citationScore} Points. Consistent local directory sync increases Google Local Pack rankings.`
  };

  // Calculate Total Footprint Score
  const totalScore = breakdown.websitePresence.score +
                     breakdown.googleBusinessProfile.score +
                     breakdown.reviews.score +
                     breakdown.socialPresence.score +
                     breakdown.businessInfo.score +
                     breakdown.citations.score;

  // Lead Score Classification:
  // Lower score = HOT lead (poorer digital presence, needs agency services)
  // Higher score = COLD lead (well-optimized)
  let scoreCategory = "COLD";
  let reasoning = "Business is fully optimized across digital platforms. Low priority lead.";

  if (totalScore < 50) {
    scoreCategory = "HOT";
    reasoning = "Critical digital gaps detected (missing website/social/GBP review history). High priority lead.";
  } else if (totalScore < 80) {
    scoreCategory = "WARM";
    reasoning = "Moderate digital presence. Performance optimizations and citation reviews required.";
  }

  return {
    digitalFootprintScore: totalScore,
    scoreCategory, // "HOT", "WARM", "COLD"
    reasoning,
    breakdown
  };
}
