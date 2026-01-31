---
name: pdf-generation
description: Generate PDF exports from match logs using Lambda with PDFKit or Puppeteer. Use when implementing PDF export feature, formatting match recaps, or optimizing PDF generation performance.
---

# PDF Generation for btl.run

## Requirements

**Export match story as a formatted PDF:**

- Title page with match metadata
- Chapters per day/phase
- Event narration styled as story text
- Final ranking and statistics
- Optional: AI cleanup for polish

## Library Comparison

| Library | Size | Lambda Friendly | Use Case |
|---------|------|-----------------|----------|
| **PDFKit** | ~200KB | ✅ Yes | Simple layouts, text-heavy |
| **Puppeteer** | ~50MB | ⚠️ Needs Lambda Layer | HTML → PDF, complex layouts |
| **jsPDF** | ~150KB | ✅ Yes | Client-side capable |

**Recommendation for btl.run: PDFKit** (server-side, lightweight, sufficient for text)

## PDFKit Setup

```typescript
// services/pdf/src/index.ts
import PDFDocument from 'pdfkit';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3 = new S3Client({});

export async function generateMatchPDF(matchId: string): Promise<string> {
  // Fetch match data
  const match = await getMatchState(matchId);
  const events = await getAllEventLogs(matchId);
  
  // Optional: AI cleanup
  const cleanedNarration = match.aiCleanup
    ? await cleanupWithAI(events)
    : events.map(e => e.narration);
  
  // Generate PDF
  const pdfBuffer = await createPDF(match, cleanedNarration);
  
  // Upload to S3
  const key = `exports/${matchId}/${Date.now()}.pdf`;
  await s3.send(new PutObjectCommand({
    Bucket: process.env.EXPORT_BUCKET!,
    Key: key,
    Body: pdfBuffer,
    ContentType: 'application/pdf',
  }));
  
  // Generate signed URL (7-day expiry)
  const url = await getSignedUrl(
    s3,
    new PutObjectCommand({
      Bucket: process.env.EXPORT_BUCKET!,
      Key: key,
    }),
    { expiresIn: 604800 } // 7 days
  );
  
  return url;
}
```

## PDF Creation with PDFKit

```typescript
async function createPDF(match: MatchState, narrations: string[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'LETTER',
      margins: { top: 72, bottom: 72, left: 72, right: 72 },
    });
    
    const chunks: Buffer[] = [];
    
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    
    // Title page
    addTitlePage(doc, match);
    
    // Table of contents
    doc.addPage();
    addTableOfContents(doc, match);
    
    // Event narration by day
    for (let day = 1; day <= match.day; day++) {
      doc.addPage();
      addDayChapter(doc, match, day, narrations);
    }
    
    // Final rankings
    doc.addPage();
    addFinalRankings(doc, match);
    
    doc.end();
  });
}
```

## Title Page

```typescript
function addTitlePage(doc: PDFDocument, match: MatchState) {
  doc
    .fontSize(32)
    .font('Helvetica-Bold')
    .text('btl.run', { align: 'center' })
    .moveDown(1);
  
  doc
    .fontSize(20)
    .font('Helvetica')
    .text(match.theme.arena, { align: 'center' })
    .moveDown(2);
  
  doc
    .fontSize(12)
    .text(`Match ID: ${match.matchId}`, { align: 'center' })
    .text(`Mode: ${match.mode}`, { align: 'center' })
    .text(`Started: ${new Date(match.createdAt).toLocaleDateString()}`, { align: 'center' })
    .moveDown(2);
  
  // Roster preview
  doc
    .fontSize(14)
    .font('Helvetica-Bold')
    .text('Tributes', { align: 'center' })
    .moveDown(0.5);
  
  match.roster.forEach(tribute => {
    doc
      .fontSize(10)
      .font('Helvetica')
      .text(`${tribute.name} - ${tribute.persona.archetype}`, { align: 'center' });
  });
}
```

## Day Chapters

```typescript
function addDayChapter(
  doc: PDFDocument,
  match: MatchState,
  day: number,
  narrations: string[]
) {
  doc
    .fontSize(24)
    .font('Helvetica-Bold')
    .text(`Day ${day}`, { underline: true })
    .moveDown(1);
  
  // Filter events for this day
  const dayEvents = narrations.slice((day - 1) * 10, day * 10); // Approx
  
  dayEvents.forEach((narration, idx) => {
    doc
      .fontSize(11)
      .font('Helvetica')
      .text(narration, { align: 'justify', lineGap: 4 })
      .moveDown(1);
    
    // Page break if needed
    if (doc.y > 700) {
      doc.addPage();
    }
  });
}
```

## Final Rankings

```typescript
function addFinalRankings(doc: PDFDocument, match: MatchState) {
  doc
    .fontSize(24)
    .font('Helvetica-Bold')
    .text('Final Rankings', { underline: true })
    .moveDown(1);
  
  // Sort by alive status, then HP
  const ranked = [...match.roster].sort((a, b) => {
    if (a.alive && !b.alive) return -1;
    if (!a.alive && b.alive) return 1;
    return b.hp - a.hp;
  });
  
  ranked.forEach((tribute, idx) => {
    const rank = idx + 1;
    const status = tribute.alive ? '👑 VICTOR' : '💀 Eliminated';
    
    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .text(`${rank}. ${tribute.name}`, { continued: true })
      .font('Helvetica')
      .text(` - ${status}`)
      .fontSize(10)
      .text(`   HP: ${tribute.hp}/${tribute.maxHp} | ${tribute.persona.archetype}`)
      .moveDown(0.5);
  });
}
```

## AI Cleanup (Optional)

**Polish narration with OpenAI:**

```typescript
async function cleanupWithAI(events: Event[]): Promise<string[]> {
  const fullLog = events.map(e => e.narration).join('\n\n');
  
  const completion = await openai.chat.completions.create({
    model: 'gpt-5-nano',
    messages: [
      {
        role: 'system',
        content: `You are a story editor. Clean up this battle log:
- Fix grammar and tense consistency
- Remove repetitive phrases
- Keep key events and deaths
- Maintain dramatic tone
- Output as formatted paragraphs separated by double newlines`,
      },
      {
        role: 'user',
        content: fullLog,
      },
    ],
    temperature: 0.5,
    max_tokens: 4000,
  });
  
  const cleaned = completion.choices[0].message.content || fullLog;
  return cleaned.split('\n\n');
}
```

## Memory Optimization for Lambda

**PDFs can be large; optimize Lambda memory:**

```typescript
// CDK
new lambda.Function(this, 'PDFGenerator', {
  runtime: lambda.Runtime.NODEJS_20_X,
  memorySize: 1024, // 1GB for large PDFs
  timeout: cdk.Duration.seconds(60),
  environment: {
    EXPORT_BUCKET: exportBucket.bucketName,
  },
});
```

**Stream large PDFs to S3:**

```typescript
import { Upload } from '@aws-sdk/lib-storage';

async function streamPDFToS3(matchId: string, match: MatchState): Promise<string> {
  const doc = new PDFDocument();
  
  const upload = new Upload({
    client: s3,
    params: {
      Bucket: process.env.EXPORT_BUCKET!,
      Key: `exports/${matchId}/${Date.now()}.pdf`,
      Body: doc, // Stream directly
      ContentType: 'application/pdf',
    },
  });
  
  // Generate PDF (doc writes to stream)
  addTitlePage(doc, match);
  // ... other pages
  doc.end();
  
  await upload.done();
  
  return upload.singleUploadResult.Location;
}
```

## S3 Lifecycle Policy

**Auto-delete old exports:**

```typescript
// CDK
exportBucket.addLifecycleRule({
  id: 'delete-old-exports',
  prefix: 'exports/',
  expiration: cdk.Duration.days(30), // Delete after 30 days
});
```

## Alternative: Client-Side PDF (jsPDF)

**For lightweight client-side generation:**

```typescript
import jsPDF from 'jspdf';

function generatePDFClient(match: MatchState, events: Event[]): void {
  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(20);
  doc.text('btl.run', 105, 20, { align: 'center' });
  
  // Events
  let y = 40;
  events.forEach((event, idx) => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    
    doc.setFontSize(10);
    doc.text(event.narration, 20, y, { maxWidth: 170 });
    y += 20;
  });
  
  // Download
  doc.save(`btl-run-${match.matchId}.pdf`);
}
```

**Trade-off**: Client-side is instant but less polished; server-side is higher quality.

## Lambda Handler

```typescript
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const matchId = event.pathParameters?.matchId;
  
  if (!matchId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'matchId required' }) };
  }
  
  try {
    const url = await generateMatchPDF(matchId);
    
    return {
      statusCode: 200,
      body: JSON.stringify({ url }),
    };
  } catch (error) {
    console.error({ error });
    return { statusCode: 500, body: JSON.stringify({ error: 'PDF generation failed' }) };
  }
};
```

## Testing Locally

```typescript
// services/pdf/src/local.ts
import { generateMatchPDF } from './index';

const testMatchId = 'test-match-123';

generateMatchPDF(testMatchId)
  .then(url => console.log({ url }))
  .catch(console.error);
```

## Deployment Checklist

- [ ] PDFKit installed in package.json
- [ ] Lambda memory set to 1024MB
- [ ] Lambda timeout set to 60s
- [ ] S3 bucket created for exports
- [ ] S3 lifecycle policy configured
- [ ] IAM permissions for S3 PutObject
- [ ] Signed URL expiration configured
- [ ] AI cleanup optional and rate-limited
- [ ] Error handling for large PDFs
- [ ] Test with max-length match log

## Common Issues

**Issue**: Lambda timeout on large PDFs
- **Fix**: Increase timeout to 60s, increase memory to 1024MB

**Issue**: PDF missing fonts
- **Fix**: Use built-in fonts (Helvetica, Times, Courier) or embed custom fonts

**Issue**: Memory errors
- **Fix**: Stream PDF to S3 instead of buffering in memory

**Issue**: Slow generation
- **Fix**: Skip AI cleanup or use faster model (gpt-5-nano)
