import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import { Groq, toFile } from 'groq-sdk';
import fs from 'fs';
dotenv.config();

const upload = multer({ dest: 'uploads/' });
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const app = express();
app.use(cors());


app.post('/api/voice-to-blog',upload.single('audio'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({error: 'no audio file uploaded.'});

    }

    try {
        const transcription = await groq.audio.transcriptions.create({
            file: await toFile(fs.createReadStream(req.file.path), req.file.originalname),
            model: 'whisper-large-v3-turbo',
            language: 'en',
        });

        const completion = await groq.chat.completions.create({
            model: 'openai/gpt-oss-20b',
            messages: [
                {
                    role: 'system',
                    content: `You are helping someone turn their spoken thoughts into a clean, readable blog post — in their own voice, not a generic marketing tone.

Rules:
- Only use content the person actually said. Never invent facts, features, timelines, links, or examples that weren't in the transcript.
- Fix grammar and remove filler words ("um," "uh," repeated phrases), but keep their natural voice and phrasing where possible.
- Do not add tables, emoji, or bullet-point feature lists unless the person's original speech was already structured that way.
- Use markdown headings only if the content actually has distinct sections. A short thought doesn't need five headers.
- Write like a real person thinking out loud and organizing their thoughts, not like a corporate blog or press release.
- Always respond in English, regardless of the input language.
- Add a short, plain headline at the top — not clickbait.`,
                },
                {
                    role: 'user',
                    content: transcription.text,
                },
            ],
        });

        const essay = completion.choices[0].message.content;

        console.log('Essay:', essay);
        res.json({essay});
    } catch(error){
        console.error('Processing error:',error);
        res.status(500).json({ error: 'Failed to process voice recording.' });

    }
    finally {
    fs.unlinkSync(req.file.path);
}});

app.listen(5050, () => console.log(`Server running on port 5050`));