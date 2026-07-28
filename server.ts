import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { Resend } from "resend";

// Robust resolution of __dirname and __filename supporting both ESM (ts-node/tsx) and bundled CJS
let activeFilename = "";
let activeDirname = "";

try {
  if (typeof import.meta !== "undefined" && import.meta.url) {
    activeFilename = fileURLToPath(import.meta.url);
    activeDirname = path.dirname(activeFilename);
  } else {
    activeFilename = __filename;
    activeDirname = __dirname;
  }
} catch {
  activeFilename = typeof __filename !== "undefined" ? __filename : "";
  activeDirname = typeof __dirname !== "undefined" ? __dirname : "";
}

async function startServer() {
  const app = express();
  const rawPort = process.env.PORT || 3000;
  let portToListen: number | string = 3000;

  if (typeof rawPort === "string" && (rawPort.startsWith("/") || rawPort.startsWith("\\\\"))) {
    portToListen = rawPort;
  } else {
    const parsed = parseInt(String(rawPort), 10);
    portToListen = !isNaN(parsed) && parsed > 0 ? parsed : 3000;
  }

  // Increase payload limits for Base64 image uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Dynamic static routing for uploaded files (e.g. book covers)
  const uploadsDir = path.join(activeDirname, "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use("/uploads", express.static(uploadsDir));

  // Initialize data persistence directory
  const dataDir = path.join(activeDirname, "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const settingsPath = path.join(dataDir, "settings.json");
  const transactionsPath = path.join(dataDir, "transactions.json");
  const reviewsPath = path.join(dataDir, "reviews.json");

  // Load or seed website settings
  const defaultSettings = {
    title: "SEARCH, SOCIAL & SYSTEMS",
    subtitle: "Master Digital Marketing from Scratch with One Complete Guide",
    author: "Arun Gowtham Prabhudas",
    price: "799",
    originalPrice: "1299",
    description: "Whether you're a beginner, entrepreneur, student, or marketing professional, this book gives you the complete roadmap to understand, execute, and grow in digital marketing.",
    features: [
      "High-quality printed paperback book",
      "Free express shipping across India with live tracking link",
      "Instant access: Digital Marketing Blueprint Checklist (PDF)",
      "Instant access: Meta ads copy worksheets & GBP checklists",
      "Direct email receipt and secure download access"
    ],
    format: "Premium Monochrome Paperback",
    isbn: "978-93-6012-665-0",
    shipping: "Free Direct Shipping in India",
    coverImage: "",
    paymentMode: "upi",
    upiId: "gouthamarun123@okaxis",
    upiName: "Arun Gowtham Prabhudas",
    razorpayKeyId: "",
    razorpayKeySecret: "",
    resendApiKey: "",
    resendFromEmail: ""
  };

  let settings = { ...defaultSettings };
  if (fs.existsSync(settingsPath)) {
    try {
      settings = { ...defaultSettings, ...JSON.parse(fs.readFileSync(settingsPath, "utf-8")) };
    } catch (e) {
      console.error("Failed to parse settings, using default:", e);
    }
  } else {
    try {
      fs.writeFileSync(settingsPath, JSON.stringify(defaultSettings, null, 2), "utf-8");
    } catch (e) {
      console.error("Failed to save default settings:", e);
    }
  }

  // Load or seed transactions
  let transactions: any[] = [];
  if (fs.existsSync(transactionsPath)) {
    try {
      transactions = JSON.parse(fs.readFileSync(transactionsPath, "utf-8"));
    } catch (e) {
      console.error("Failed to parse transactions, initializing empty:", e);
    }
  } else {
    try {
      fs.writeFileSync(transactionsPath, JSON.stringify([], null, 2), "utf-8");
    } catch (e) {
      console.error("Failed to initialize transactions storage:", e);
    }
  }

  // Load or seed simulated email delivery logs
  const simulatedEmails: any[] = [];
  const validTokens = new Map<string, { email: string; planName: string; price: string; date: Date }>();

  // Load or seed default reviews
  const defaultReviews: any[] = [
    {
      id: "rev-1",
      name: "Rajesh K.",
      role: "Founder, GrowthSpark Labs",
      rating: 5,
      comment: "Absolutely incredible guide! Before this, we had isolated ads on Facebook and did random SEO. The 'Systems' pillar helped us connect our website forms to a CRM and set up immediate automated WhatsApp follow-ups. Our lead-to-conversion rate jumped by 22% in three weeks. Worth every penny!",
      date: "2026-06-15T14:30:00.000Z",
      avatarBg: "from-orange-500 to-amber-500"
    },
    {
      id: "rev-2",
      name: "Sarah Jenkins",
      role: "Freelance Digital Marketer",
      rating: 5,
      comment: "Most digital marketing guides are full of useless filler definitions. Arun cuts straight to the point. The chapters on SEO vs GEO (Generative Engine Optimization) and AEO are worth the price alone. I am already using his Meta Business Manager workflow with two of my new agency clients.",
      date: "2026-06-20T09:15:00.000Z",
      avatarBg: "from-blue-600 to-cyan-500"
    },
    {
      id: "rev-3",
      name: "Ethan Hunt",
      role: "Marketing Student",
      rating: 4,
      comment: "As a student, marketing textbooks are super dry. This book explains complex concepts in a highly visual and digestible way. I loved the breakdown of the Customer Journey Mapping. Lost 1 star only because I wanted more specific code snippets for Tag Manager, but the conceptual explanation was perfect.",
      date: "2026-06-25T18:45:00.000Z",
      avatarBg: "from-emerald-500 to-teal-600"
    },
    {
      id: "rev-4",
      name: "Meera Nair",
      role: "D2C Brand Creator",
      rating: 5,
      comment: "A magnificent read! The 'Social' pillar details exactly how to build authentic, long-term brand trust so customers are pre-sold before they even hit your checkout button. This blueprint completely changed how we write our Instagram hook captions and email newsletters.",
      date: "2026-06-28T11:05:00.000Z",
      avatarBg: "from-purple-600 to-pink-500"
    }
  ];

  let reviews: any[] = [...defaultReviews];
  if (fs.existsSync(reviewsPath)) {
    try {
      reviews = JSON.parse(fs.readFileSync(reviewsPath, "utf-8"));
    } catch (e) {
      console.error("Failed to parse reviews, falling back to defaults:", e);
    }
  } else {
    try {
      fs.writeFileSync(reviewsPath, JSON.stringify(defaultReviews, null, 2), "utf-8");
    } catch (e) {
      console.error("Failed to save default reviews:", e);
    }
  }

  // Initialize Resend dynamically if key is provided
  let resendInstance: Resend | null = null;
  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey) {
    try {
      resendInstance = new Resend(resendApiKey);
      console.log("Resend email delivery service successfully initialized.");
    } catch (e) {
      console.error("Failed to initialize Resend with the provided key:", e);
    }
  } else {
    console.log("No RESEND_API_KEY found. Running in interactive visual simulation mode.");
  }

  // --- API ENDPOINTS ---

  // Checkout API Endpoint
  app.post("/api/checkout", async (req, res) => {
    try {
      const { name, email, phone, address, city, state, pincode, planId, planName, price, paymentMethod, paymentId, cardNumber, expiry, cvc } = req.body;

      // Basic validation
      if (!name || !email || !phone || !address || !city || !state || !pincode || !planId) {
        return res.status(400).json({ error: "Missing required checkout or shipping address fields." });
      }

      const method = paymentMethod || "credit_card";

      // If simulated credit card, validate inputs
      if (method === "credit_card") {
        if (!cardNumber || !expiry || !cvc) {
          return res.status(400).json({ error: "Missing required payment card details." });
        }
        const cleanCard = cardNumber.replace(/\s+/g, "");
        if (cleanCard.length < 15 || cleanCard.length > 16) {
          return res.status(400).json({ error: "Invalid card number length. Please check your payment details." });
        }

        const cleanCvc = cvc.trim();
        if (cleanCvc.length < 3 || cleanCvc.length > 4 || isNaN(Number(cleanCvc))) {
          return res.status(400).json({ error: "Invalid Card Security Code (CVC)." });
        }
      }

      // Generate a secure transaction ID and download token for the companion kit
      const transactionId = "TXN-" + Math.random().toString(36).substring(2, 10).toUpperCase();
      const downloadToken = "DL-" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

      // Store token validity
      validTokens.set(downloadToken, {
        email,
        planName,
        price,
        date: new Date(),
      });

      const transaction = {
        transactionId,
        downloadToken,
        name,
        email,
        phone,
        address,
        city,
        state,
        pincode,
        planId,
        planName,
        price,
        paymentMethod: method,
        paymentId: paymentId || null,
        date: new Date().toISOString(),
      };
      transactions.push(transaction);
      try {
        fs.writeFileSync(transactionsPath, JSON.stringify(transactions, null, 2), "utf-8");
      } catch (writeErr) {
        console.error("Failed to persist transaction to disk:", writeErr);
      }

      // Formulate a beautiful HTML email receipt with a secure download button for companion kit
      const appUrl = process.env.APP_URL || `http://localhost:${portToListen}`;
      const downloadUrl = `${appUrl}/api/download?token=${downloadToken}`;

      const emailSubject = `Order Confirmed: "Search, Social & Systems" Paperback Edition 📚`;
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Thank you for your order</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05); }
            .header { background-color: #1e3a8a; padding: 32px; text-align: center; color: #ffffff; }
            .header h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.025em; }
            .header p { margin: 8px 0 0; color: #93c5fd; font-size: 14px; }
            .content { padding: 40px 32px; }
            .greeting { font-size: 18px; font-weight: 600; margin-top: 0; color: #1e3a8a; }
            .intro { font-size: 15px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
            .details-box { background-color: #f1f5f9; border-radius: 8px; padding: 20px; margin-bottom: 24px; border: 1px solid #e2e8f0; }
            .details-title { font-size: 12px; font-weight: 700; text-transform: uppercase; tracking: 0.05em; color: #1e3a8a; margin-bottom: 12px; }
            .details-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
            .details-row:last-child { margin-bottom: 0; padding-top: 8px; border-top: 1px solid #cbd5e1; font-weight: bold; color: #1e293b; }
            .shipping-box { border-left: 4px solid #1e3a8a; background-color: #f8fafc; padding: 16px; margin-bottom: 32px; font-size: 14px; line-height: 1.5; color: #334155; }
            .cta-container { text-align: center; margin: 32px 0; }
            .btn { display: inline-block; background-color: #2563eb; color: #ffffff !important; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 15px; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2); transition: background-color 0.2s; }
            .btn:hover { background-color: #1d4ed8; }
            .footer { background-color: #f8fafc; padding: 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
            .footer p { margin: 4px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Search, Social & Systems</h1>
              <p>Printed Paperback Order Confirmed!</p>
            </div>
            <div class="content">
              <p class="greeting">Hello ${name},</p>
              <p class="intro">Thank you for ordering a physical copy of <strong>Search, Social & Systems</strong>! We are preparing your printed edition for shipping. It will be dispatched via express courier with tracking details sent shortly to your phone/email.</p>
              
              <div class="details-box">
                <div class="details-title">Order Summary</div>
                <div style="margin-bottom: 12px;">
                  <span style="font-weight: 600; font-size: 15px; color: #1e3a8a;">${planName}</span>
                </div>
                <div class="details-row">
                  <span>Transaction ID</span>
                  <span style="font-family: monospace; color: #1e293b;">${transactionId}</span>
                </div>
                <div class="details-row">
                  <span>Order Date</span>
                  <span>${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span>
                </div>
                <div class="details-row" style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed #cbd5e1;">
                  <span>${method === "cash_on_delivery" ? "Amount to Pay on Delivery" : "Total Paid (Paperback Only)"}</span>
                  <span style="color: #1e3a8a; font-weight: bold;">${price}</span>
                </div>
              </div>

              <div class="details-title" style="color: #1e3a8a; margin-top: 24px;">Delivery Address</div>
              <div class="shipping-box">
                <strong>${name}</strong><br>
                ${address}<br>
                ${city}, ${state} - ${pincode}<br>
                Contact: ${phone}
              </div>

              <p class="intro">In the meantime, your companion bonus kit is immediately ready for download! Start reading the blueprints and checklists right away.</p>

              <div class="cta-container">
                <a href="${downloadUrl}" class="btn">Download Free Companion Kit</a>
              </div>

              <p class="intro" style="font-size: 13px; color: #64748b; text-align: center; margin-top: 24px;">
                Note: This secure download is linked to your email (${email}). If you have questions about your delivery, reply directly to this message.
              </p>
            </div>
            <div class="footer">
              <p>Search, Social & Systems &copy; 2026</p>
              <p>Physical printed copy distribution hub &bull; Arun Gowtham Prabhudas</p>
            </div>
          </div>
        </body>
        </html>
      `;

      let emailSentSuccessfully = false;
      let errorDetails = "";

      // Send actual email if Resend is configured
      const activeResendKey = settings.resendApiKey || process.env.RESEND_API_KEY;
      let activeResend: Resend | null = null;
      if (activeResendKey) {
        try {
          activeResend = new Resend(activeResendKey);
        } catch (initErr: any) {
          console.error("Failed to initialize dynamic Resend client:", initErr);
          errorDetails = `Initialization error: ${initErr.message || initErr}`;
        }
      }

      if (activeResend) {
        try {
          const fromAddr = (settings.resendFromEmail && settings.resendFromEmail.trim()) ? settings.resendFromEmail.trim() : "Search, Social & Systems <onboarding@resend.dev>";
          const emailResponse = await activeResend.emails.send({
            from: fromAddr,
            to: email,
            subject: emailSubject,
            html: emailHtml,
          });
          if (emailResponse.error) {
            console.error("Resend API Error details:", emailResponse.error);
            errorDetails = emailResponse.error.message;
          } else {
            emailSentSuccessfully = true;
          }
        } catch (emailError: any) {
          console.error("Resend delivery failed:", emailError);
          errorDetails = emailError.message || String(emailError);
        }
      }

      // Always populate the simulated email list for interactive review/sandbox
      const simulationRecord = {
        id: "SIM-" + Math.random().toString(36).substring(2, 7).toUpperCase(),
        to: email,
        subject: emailSubject,
        html: emailHtml,
        timestamp: new Date().toISOString(),
        isRealSent: emailSentSuccessfully,
        error: errorDetails,
      };
      simulatedEmails.unshift(simulationRecord);

      return res.status(200).json({
        success: true,
        transactionId,
        downloadToken,
        downloadUrl,
        emailSimulated: !emailSentSuccessfully,
        emailError: errorDetails,
      });

    } catch (err: any) {
      console.error("Checkout process error:", err);
      return res.status(500).json({ error: "An error occurred during secure checkout processing." });
    }
  });

  // Free Sample Chapter API Endpoint
  app.post("/api/sample", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email || !email.includes("@")) {
        return res.status(400).json({ error: "Please enter a valid email address to receive your free sample." });
      }

      // Generate simulated sample chapter email
      const sampleId = "SMP-" + Math.random().toString(36).substring(2, 7).toUpperCase();
      const emailSubject = `Your Free Sample Chapter: "Search, Social & Systems" 📖`;
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Your Free Sample Chapter</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05); }
            .header { background-color: #0f172a; padding: 32px; text-align: center; color: #ffffff; }
            .header h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.025em; }
            .header p { margin: 8px 0 0; color: #38bdf8; font-size: 14px; }
            .content { padding: 40px 32px; }
            .greeting { font-size: 18px; font-weight: 600; margin-top: 0; color: #0f172a; }
            .intro { font-size: 15px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
            .sample-box { background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 24px; margin-bottom: 24px; font-style: italic; line-height: 1.6; font-size: 14px; color: #334155; }
            .cta-container { text-align: center; margin: 32px 0; }
            .btn { display: inline-block; background-color: #0f172a; color: #ffffff !important; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 15px; box-shadow: 0 4px 6px -1px rgba(15, 23, 42, 0.2); transition: background-color 0.2s; }
            .btn:hover { background-color: #1e293b; }
            .footer { background-color: #f8fafc; padding: 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
            .footer p { margin: 4px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Search, Social & Systems</h1>
              <p>Your Free Sample Chapter is Here!</p>
            </div>
            <div class="content">
              <p class="greeting">Hello Future Digital Marketer,</p>
              <p class="intro">Thank you for requesting a sample chapter of <strong>Search, Social & Systems</strong> by Arun Gowtham Prabhudas. We are thrilled to share this with you!</p>
              
              <div class="sample-box">
                <p><strong>Chapter 1 Preview: The Digital Marketing Mindset</strong></p>
                <p>"...Digital marketing is not about collecting followers; it is about establishing digital infrastructure. Most businesses waste time chasing likes on Instagram. However, unless you understand how search queries (Search), social validation (Social), and automated systems (Systems) converge to nurture a stranger into a client, you will continue spending marketing dollars on random actions rather than predictable business results..."</p>
              </div>

              <p class="intro">To read the rest of Chapter 1, along with the complete Framework Blueprint Map and Marketing Tool Checklist, click the link below to download the companion preview kit (PDF).</p>

              <div class="cta-container">
                <a href="/api/download?token=PREVIEW_TOKEN_GUEST" class="btn">Download Free Sample & Toolkit (PDF)</a>
              </div>

              <p class="intro" style="font-size: 13px; color: #64748b; text-align: center; margin-top: 24px;">
                Ready to own the entire 21-chapter physical printed master guide? Get free express delivery across India for just ₹599.
              </p>
            </div>
            <div class="footer">
              <p>Search, Social & Systems &copy; 2026</p>
              <p>Written by Arun Gowtham Prabhudas</p>
            </div>
          </div>
        </body>
        </html>
      `;

      // Insert preview token
      validTokens.set("PREVIEW_TOKEN_GUEST", {
        email,
        planName: "Free Preview Chapter 1 & Toolkit",
        price: "Free",
        date: new Date(),
      });

      let emailSentSuccessfully = false;
      let errorDetails = "";

      const activeResendKey = settings.resendApiKey || process.env.RESEND_API_KEY;
      let activeResend: Resend | null = null;
      if (activeResendKey) {
        try {
          activeResend = new Resend(activeResendKey);
        } catch (initErr: any) {
          console.error("Failed to initialize dynamic Resend client for sample:", initErr);
        }
      }

      if (activeResend) {
        try {
          const emailResponse = await activeResend.emails.send({
            from: "Search, Social & Systems <onboarding@resend.dev>", // Or verified domain
            to: email,
            subject: emailSubject,
            html: emailHtml,
          });
          if (!emailResponse.error) {
            emailSentSuccessfully = true;
          } else {
            console.error("Resend API Error details for sample:", emailResponse.error);
            errorDetails = emailResponse.error.message;
          }
        } catch (emailError: any) {
          console.error("Resend delivery failed for sample:", emailError);
          errorDetails = emailError.message || String(emailError);
        }
      }

      // Always populate the simulated email list for sandbox visualization
      const simulationRecord = {
        id: sampleId,
        to: email,
        subject: emailSubject,
        html: emailHtml,
        timestamp: new Date().toISOString(),
        isRealSent: emailSentSuccessfully,
        error: errorDetails,
      };
      simulatedEmails.unshift(simulationRecord);

      return res.status(200).json({ success: true, emailSimulated: !emailSentSuccessfully, emailError: errorDetails });
    } catch (err: any) {
      console.error("Sample process error:", err);
      return res.status(500).json({ error: "An error occurred while preparing your sample." });
    }
  });

  // Get Simulated Emails API (for developer review / sandbox visualization)
  app.get("/api/simulated-emails", (req, res) => {
    res.json(simulatedEmails);
  });

  // Get Reviews API
  app.get("/api/reviews", (req, res) => {
    res.json(reviews);
  });

  // Submit Review API
  app.post("/api/reviews", (req, res) => {
    try {
      const { name, role, rating, comment } = req.body;

      if (!name || !rating || !comment) {
        return res.status(400).json({ error: "Missing required fields: Name, Rating, and Review content are mandatory." });
      }

      const ratingNum = Number(rating);
      if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
        return res.status(400).json({ error: "Rating must be a numeric value between 1 and 5." });
      }

      // Generate random stylish gradients for user avatars
      const gradients = [
        "from-orange-500 to-amber-500",
        "from-blue-600 to-cyan-500",
        "from-emerald-500 to-teal-600",
        "from-purple-600 to-pink-500",
        "from-indigo-500 to-violet-600",
        "from-rose-500 to-red-500"
      ];
      const randomGradient = gradients[Math.floor(Math.random() * gradients.length)];

      const newReview = {
        id: "rev-" + Math.random().toString(36).substring(2, 9),
        name: name.trim(),
        role: role ? role.trim() : "Verified Purchaser",
        rating: ratingNum,
        comment: comment.trim(),
        date: new Date().toISOString(),
        avatarBg: randomGradient
      };

      reviews.unshift(newReview);
      try {
        fs.writeFileSync(reviewsPath, JSON.stringify(reviews, null, 2), "utf-8");
      } catch (writeErr) {
        console.error("Failed to persist reviews to disk:", writeErr);
      }
      return res.status(201).json({ success: true, review: newReview });
    } catch (err) {
      console.error("Failed to post review:", err);
      return res.status(500).json({ error: "An error occurred while publishing your review." });
    }
  });

  // Clear simulated email log
  app.post("/api/simulated-emails/clear", (req, res) => {
    simulatedEmails.length = 0;
    res.json({ success: true });
  });

  // Download API Endpoint: Generates and streams a custom premium digital guide pack containing the actual outline, framework blueprints, and checklist.
  app.get("/api/download", (req, res) => {
    try {
      const token = req.query.token as string;
      if (!token) {
        return res.status(400).send("<h1>Download Error</h1><p>Missing secure download token.</p>");
      }

      const tokenDetails = validTokens.get(token);
      if (!tokenDetails) {
        return res.status(403).send("<h1>Download Error</h1><p>Invalid or expired download token. Please contact support.</p>");
      }

      // Create a premium customized PDF guide content to send.
      // Since it's a PDF download, let's stream a valid dynamic PDF file content representing the guide and checklists!
      // Here, we can create a beautiful plain text PDF structure or markdown guide.
      // To satisfy a real file download, let's output a beautiful PDF that says "Search, Social & Systems - Digital Edition Guide"
      // Wait, we can generate a valid minimal PDF programmatically with the book contents and checklists!
      // Let's create a beautiful valid PDF buffer.
      
      const pdfBuffer = Buffer.from(
        `%PDF-1.4\n` +
        `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n` +
        `2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n` +
        `3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources 4 0 R /MediaBox [0 0 612 792] /Contents 5 0 R >>\nendobj\n` +
        `4 0 obj\n<< /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> /F2 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >>\nendobj\n` +
        `5 0 obj\n<< /Length 1200 >>\nstream\n` +
        `BT\n` +
        `/F1 22 Tf\n` +
        `50 720 Td\n` +
        `(SEARCH, SOCIAL & SYSTEMS) Tj\n` +
        `0 -26 Td\n` +
        `/F2 14 Tf\n` +
        `(A Professional Digital Marketing Master Guide) Tj\n` +
        `0 -20 Td\n` +
        `(Written by Arun Gowtham Prabhudas) Tj\n` +
        `0 -40 Td\n` +
        `/F1 14 Tf\n` +
        `(THANK YOU FOR YOUR PURCHASE!) Tj\n` +
        `0 -24 Td\n` +
        `/F2 11 Tf\n` +
        `(Licensed uniquely to: ${tokenDetails.email}) Tj\n` +
        `0 -18 Td\n` +
        `(Product Package: ${tokenDetails.planName}) Tj\n` +
        `0 -18 Td\n` +
        `(Date Issued: ${tokenDetails.date.toLocaleDateString()}) Tj\n` +
        `0 -40 Td\n` +
        `/F1 13 Tf\n` +
        `(THE CORE MARKETING FRAMEWORK) Tj\n` +
        `0 -22 Td\n` +
        `/F2 10 Tf\n` +
        `(1. SEARCH - Get discovered precisely when buyers are actively searching.) Tj\n` +
        `0 -16 Td\n` +
        `(2. SOCIAL - Build authentic trust before direct contact or outreach is made.) Tj\n` +
        `0 -16 Td\n` +
        `(3. SYSTEMS - Programmatic capture, automation, and structured performance analytics.) Tj\n` +
        `0 -40 Td\n` +
        `/F1 12 Tf\n` +
        `(YOUR DIGITAL COMPANION CHECKLIST) Tj\n` +
        `0 -20 Td\n` +
        `/F2 10 Tf\n` +
        `([ ] Audit and claim your Google Business Profile fully.) Tj\n` +
        `0 -15 Td\n` +
        `([ ] Connect and verify Google Search Console, Analytics, and Tag Manager.) Tj\n` +
        `0 -15 Td\n` +
        `([ ] Draft a 3-stage customer funnel journey (Discovery, Consideration, Trust).) Tj\n` +
        `0 -15 Td\n` +
        `([ ] Set up automated follow-up triggers and CRM integrations.) Tj\n` +
        `0 -30 Td\n` +
        `/F1 11 Tf\n` +
        `(This is your secure companion download file.) Tj\n` +
        `0 -15 Td\n` +
        `/F2 9 Tf\n` +
        `(Please keep this document secure. Copyright 2026 Arun Gowtham Prabhudas. All rights reserved.) Tj\n` +
        `ET\n` +
        `endstream\nendobj\n` +
        `xref\n` +
        `0 6\n` +
        `0000000000 65535 f\n` +
        `0000000009 00000 n\n` +
        `0000000058 00000 n\n` +
        `0000000115 00000 n\n` +
        `0000000220 00000 n\n` +
        `0000000355 00000 n\n` +
        `trailer\n<< /Size 6 /Root 1 0 R >>\n` +
        `startxref\n` +
        `1620\n` +
        `%%EOF`
      );

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="search_social_systems_guide.pdf"`);
      return res.send(pdfBuffer);

    } catch (downloadErr) {
      console.error("Download stream error:", downloadErr);
      return res.status(500).send("<h1>Download Error</h1><p>Failed to compile your download package. Please try again.</p>");
    }
  });

  // --- SETTINGS & CONTENT MANAGEMENT API ENDPOINTS ---

  // Get Settings
  app.get("/api/settings", (req, res) => {
    res.json(settings);
  });

  // Update Settings
  app.post("/api/settings", (req, res) => {
    try {
      const newSettings = req.body;
      if (!newSettings || typeof newSettings !== "object") {
        return res.status(400).json({ error: "Invalid settings payload." });
      }

      settings = { ...settings, ...newSettings };
      fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), "utf-8");
      res.json({ success: true, settings });
    } catch (err: any) {
      console.error("Failed to update settings:", err);
      res.status(500).json({ error: "Failed to update settings on disk." });
    }
  });

  // Reset Settings
  app.post("/api/reset-settings", (req, res) => {
    try {
      settings = { ...defaultSettings };
      fs.writeFileSync(settingsPath, JSON.stringify(defaultSettings, null, 2), "utf-8");
      res.json({ success: true, settings });
    } catch (err: any) {
      console.error("Failed to reset settings:", err);
      res.status(500).json({ error: "Failed to reset settings on disk." });
    }
  });

  // Base64 File Upload
  app.post("/api/upload", (req, res) => {
    try {
      const { fileData, fileName } = req.body;
      if (!fileData || !fileName) {
        return res.status(400).json({ error: "Missing fileData or fileName. File upload requires both." });
      }

      // Check if fileData is valid base64 URI
      const matches = fileData.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      let buffer: Buffer;
      let cleanFileName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, "_"); // sanitize

      if (matches && matches.length === 3) {
        buffer = Buffer.from(matches[2], "base64");
      } else {
        // Raw base64 string
        buffer = Buffer.from(fileData, "base64");
      }

      const destPath = path.join(uploadsDir, cleanFileName);
      fs.writeFileSync(destPath, buffer);

      console.log(`Successfully saved uploaded file to ${destPath}`);
      res.json({ success: true, url: `/uploads/${cleanFileName}` });
    } catch (err: any) {
      console.error("File upload failed:", err);
      res.status(500).json({ error: "An error occurred during file upload." });
    }
  });

  // Get Transactions (Log View for Admin Panel)
  app.get("/api/transactions", (req, res) => {
    res.json(transactions);
  });

  // Fulfill Order Endpoint
  app.post("/api/fulfill-order", async (req, res) => {
    try {
      const { transactionId, courierName, trackingId } = req.body;
      if (!transactionId) {
        return res.status(400).json({ error: "Missing transactionId." });
      }

      const txIndex = transactions.findIndex((t: any) => t.transactionId === transactionId);
      if (txIndex === -1) {
        return res.status(404).json({ error: "Order transaction not found." });
      }

      const tx = transactions[txIndex];
      tx.status = "Fulfilled";
      tx.courierName = courierName || "Express Courier";
      tx.trackingId = trackingId || ("TRK-" + Math.random().toString(36).substring(2, 8).toUpperCase());
      tx.fulfilledAt = new Date().toISOString();

      fs.writeFileSync(transactionsPath, JSON.stringify(transactions, null, 2), "utf-8");

      // Dispatch confirmation email
      const dispatchSubject = `Your Order ${tx.transactionId} Has Been Dispatched! 📦`;
      const dispatchHtml = `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><title>Order Dispatched</title></head>
        <body style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 20px;">
          <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 30px;">
            <h2 style="color: #0f172a; margin-top: 0;">Order Dispatched! 🚚</h2>
            <p style="color: #475569;">Hello <strong>${tx.name}</strong>,</p>
            <p style="color: #475569;">Great news! Your physical copy of <strong>Search, Social & Systems</strong> has been packed and handed over to the courier service.</p>
            
            <div style="background: #f1f5f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Order ID:</strong> ${tx.transactionId}</p>
              <p style="margin: 5px 0;"><strong>Courier Partner:</strong> ${tx.courierName}</p>
              <p style="margin: 5px 0;"><strong>Tracking ID:</strong> <span style="font-family: monospace; font-size: 16px; color: #2563eb;">${tx.trackingId}</span></p>
            </div>

            <p style="color: #475569;">Delivery Address:<br>
            ${tx.address}<br>
            ${tx.city}, ${tx.state} - ${tx.pincode}</p>

            <p style="color: #64748b; font-size: 12px; margin-top: 25px;">Thank you for your purchase!<br>Search, Social & Systems Team</p>
          </div>
        </body>
        </html>
      `;

      // Try sending via Resend if active
      const activeResendKey = settings.resendApiKey || process.env.RESEND_API_KEY;
      if (activeResendKey) {
        try {
          const resendClient = new Resend(activeResendKey);
          const fromAddr = (settings.resendFromEmail && settings.resendFromEmail.trim()) ? settings.resendFromEmail.trim() : "Search, Social & Systems <onboarding@resend.dev>";
          await resendClient.emails.send({
            from: fromAddr,
            to: tx.email,
            subject: dispatchSubject,
            html: dispatchHtml,
          });
        } catch (emailErr) {
          console.error("Failed sending dispatch email:", emailErr);
        }
      }

      res.json({ success: true, transaction: tx });
    } catch (err: any) {
      console.error("Failed to fulfill order:", err);
      res.status(500).json({ error: "Failed to update order fulfillment status." });
    }
  });

  // Delete Review
  app.delete("/api/reviews/:id", (req, res) => {
    try {
      const id = req.params.id;
      const index = reviews.findIndex((r) => r.id === id);
      if (index === -1) {
        return res.status(404).json({ error: "Review not found." });
      }

      reviews.splice(index, 1);
      fs.writeFileSync(reviewsPath, JSON.stringify(reviews, null, 2), "utf-8");
      res.json({ success: true });
    } catch (err: any) {
      console.error("Failed to delete review:", err);
      res.status(500).json({ error: "Failed to delete review from disk." });
    }
  });


  // --- VITE MIDDLEWARE SETUP OR STATIC ASSET SERVING ---

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    let distPath = path.join(process.cwd(), "dist");
    if (!fs.existsSync(distPath) || !fs.existsSync(path.join(distPath, "index.html"))) {
      distPath = activeDirname;
    }
    if (!fs.existsSync(path.join(distPath, "index.html"))) {
      distPath = process.cwd();
    }
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  if (typeof portToListen === "string" && (portToListen.startsWith("/") || portToListen.startsWith("\\\\"))) {
    app.listen(portToListen, () => {
      console.log(`Express custom server running on socket ${portToListen}`);
    });
  } else {
    const portNum = Number(portToListen) || 3000;
    app.listen(portNum, "0.0.0.0", () => {
      console.log(`Express custom server running on http://0.0.0.0:${portNum}`);
    });
  }
}

startServer().catch((err) => {
  console.error("Critical error starting Express + Vite server:", err);
});
