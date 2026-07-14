
import 'dotenv/config';
import { authUser } from '../src/controllers/authController';
import { Request, Response } from 'express';

async function runTest() {
    console.log("Testing authUser controller...");

    const req = {
        body: {
            email: 'edufolio@dad.com',
            password: 'wrongpassword' // Expect 401, not 500
        }
    } as Request;

    const res = {
        json: (data: any) => console.log('Response JSON:', data),
        status: (code: number) => {
            console.log('Response Status:', code);
            return res;
        }
    } as unknown as Response;

    try {
        await authUser(req, res);
    } catch (error) {
        console.error("Caught error:", error);
    }
}

runTest();
