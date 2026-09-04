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
        });

        const completion = await groq.chat.completions.create({
            model: 'openai/gpt-oss-20b',
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert ghostwriter. Rewrite the following spoken transcript into a well-structured, polished blog post. Fix grammar, remove filler words, add a headline, and format with markdown headings.',
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