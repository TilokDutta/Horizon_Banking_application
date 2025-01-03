"use server"

import { ID } from "node-appwrite";
import { createAdminClient, createSessionClient } from "../appwrite";
import { cookies } from "next/headers";
import { parseStringify } from "../utils";
import { NextResponse } from "next/server";

export const SignIn = async({email,password}:signInProps) =>{
    try{
        const { account } = await createAdminClient();
        console.log(email,password);
        const response = await account.createEmailPasswordSession(
            email,
            password,
        )
        return parseStringify(response);
    }catch(error){
        console.error('Error',error);
    }
}

export const SignUp = async(userData:SignUpParams) =>{
    const {email,password,firstName,lastName} = userData;

    try{
        const { account } = await createAdminClient();
        const newUserAccount = await account.create(
            ID.unique(), 
            email, 
            password, 
            `${firstName} ${lastName}`
        );
        const session = await account.createEmailPasswordSession(email, password);
        (await cookies()).set("appwrite-session", session.secret, {
            path: "/",
            httpOnly: true,
            sameSite: "strict",
            secure: true,
        });
        return parseStringify(newUserAccount);
    }catch(error){
        console.error('Error',error);
    }
}


// ... your initilization functions

export async function getLoggedInUser() {
    try {
      const { account } = await createSessionClient();
      const user = await account.get();
      return parseStringify(user);
    } catch (error) {
      return null;
    }
  }

 
export const logoutAccount = async () => {
    try {
        const { account } = await createSessionClient();

        // Create a response to manage cookies
        const response = NextResponse.next();
        
        // Set the cookie to expire
        response.cookies.set("appwrite-session", "", {
            path: "/",
            httpOnly: true,
            sameSite: "strict",
            secure: true,
            expires: new Date(0), // Immediately expires the cookie
        });

        // Delete the Appwrite session
        await account.deleteSession("current");

        // return response; // Return the response to the caller
    } catch (error) {
        console.error("Error logging out:", error);
    }
};