"use server"

import { ID } from "node-appwrite";
import { createAdminClient, createSessionClient } from "../appwrite";
import { cookies } from "next/headers";
import { encryptId, extractCustomerIdFromUrl, parseStringify } from "../utils";
import { NextResponse } from "next/server";
import {CountryCode,ProcessorTokenCreateRequest,ProcessorTokenCreateRequestProcessorEnum,Products} from 'plaid';
import { plaidClient } from "../plaid";
import { revalidatePath } from "next/cache";
import { addFundingSource, createDwollaCustomer } from "./dwolla.action";
// import { Products, CountryCode } from 'plaid';


const {
    APPWRITE_DATABASE_ID : DATABASE_ID,
    APPWRITE_USER_COLLECTION_ID : USER_COLLECTION_ID,
    APPWRITE_BANK_COLLECTION_ID : BANK_COLLECTION_ID,
} = process.env;

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

export const SignUp = async({password,...userData}:SignUpParams) =>{
    const {email,firstName,lastName} = userData;
    let newUserAccount;
    try{
        const { account,database } = await createAdminClient();

        //step:1 create a new user account  

        newUserAccount = await account.create(
            ID.unique(), 
            email, 
            password, 
            `${firstName} ${lastName}`
        );

        if(!newUserAccount) throw new Error("Error creating user");
        
        // console.log("New User Account:", newUserAccount);


        // step:2 Create a dwolla customer account

        const dwollaCustomerUrl = await createDwollaCustomer({
            ...userData, 
            type:'personal'
        });

        if(!dwollaCustomerUrl) throw new Error("Error creating Dwolla customer")
        
        // console.log("Dwolla Customer URL:", dwollaCustomerUrl);


        const dwollaCustomerId = extractCustomerIdFromUrl(dwollaCustomerUrl);
        // console.log("Dwolla Customer ID:", dwollaCustomerId);

        //step 3: Create a new user document in the datbase

        const newUser = await database.createDocument(
            DATABASE_ID!,
            USER_COLLECTION_ID!,
            ID.unique(),
            {
                ...userData,
                userId:newUserAccount.$id,
                dwollaCustomerId,
                dwollaCustomerUrl,
            }
        )

        const session = await account.createEmailPasswordSession(email, password);
        (await cookies()).set("appwrite-session", session.secret, {
            path: "/",
            httpOnly: true,
            sameSite: "strict",
            secure: true,
        });
        return parseStringify(newUser);
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


// export const createLinkToken = async(user:User) =>{
//     try{
//         const tokenParams = {
//             user:{
//                 client_user_id:user?.$id,
//             },
//             client_name: `${user.firstName} ${user.lastName}`,
//             products:['auth'] as Products[],
//             language:'en',
//             country_codes:['US'] as CountryCode[],
//         }
//         console.log(tokenParams);
//         // const response = await plaidClient.linkTokenCreate(tokenParams);

//         try {
//             const response = await plaidClient.linkTokenCreate(tokenParams);
//         } catch (error) {
//             if (error instanceof Error) {
//                 console.error("Plaid API Error:", (error as any).response?.data || error.message);
//             } else {
//                 console.error("Plaid API Error:", error);
//             }
//         }
        

//         // return parseStringify({linkToken: response.data.link_token});
//     }catch(error){
//         console.log(error);
//     }
// }

export const createLinkToken = async (user: User) => {
    try {
      const tokenParams = {
        user: {
          client_user_id: user.$id
        },
        client_name: `${user.firstName} ${user.lastName}`,
        products: ['auth'] as Products[],
        language: 'en',
        country_codes: ['US'] as CountryCode[],
      }
  
      const response = await plaidClient.linkTokenCreate(tokenParams);
  
      return parseStringify({ linkToken: response.data.link_token })
    } catch (error) {
      console.log(error);
    }
  }

export const createBankAccount = async({
    userId,
    bankId,
    accountId,
    accessToken,
    fundingSourceUrl,
    sharableId,
    } : createBankAccountProps) => {
        try{
            const {database} = await createAdminClient();
            const bankAccount = await database.createDocument(
                DATABASE_ID! ,
                BANK_COLLECTION_ID!,
                ID.unique(),
                {
                    userId,
                    bankId,
                    accountId,
                    accessToken,
                    fundingSourceUrl,
                    sharableId,
                }
            )

            return parseStringify(bankAccount);
        }catch(error){
            console.log(error);
        }
}

export const exchangePublicToken = async ({
    publicToken,
    user,
  }: exchangePublicTokenProps) => {
    try {
      // Exchange public token for access token and item ID
      const response = await plaidClient.itemPublicTokenExchange({
        public_token: publicToken,
      });
  
      const accessToken = response.data.access_token;
      const itemId = response.data.item_id;
      
      // Get account information from Plaid using the access token
      const accountsResponse = await plaidClient.accountsGet({
        access_token: accessToken,
      });
  
      const accountData = accountsResponse.data.accounts[0];
  
      // Create a processor token for Dwolla using the access token and account ID
      const request: ProcessorTokenCreateRequest = {
        access_token: accessToken,
        account_id: accountData.account_id,
        processor: "dwolla" as ProcessorTokenCreateRequestProcessorEnum,
      };
  
      const processorTokenResponse = await plaidClient.processorTokenCreate(request);
      const processorToken = processorTokenResponse.data.processor_token;
  
       // Create a funding source URL for the account using the Dwolla customer ID, processor token, and bank name
       const fundingSourceUrl = await addFundingSource({
        dwollaCustomerId: user.dwollaCustomerId,
        processorToken,
        bankName: accountData.name,
      });
      
      // If the funding source URL is not created, throw an error
      if (!fundingSourceUrl) throw Error;
  
      // Create a bank account using the user ID, item ID, account ID, access token, funding source URL, and shareableId ID
      await createBankAccount({
        userId: user.$id,
        bankId: itemId,
        accountId: accountData.account_id,
        accessToken,
        fundingSourceUrl,
        sharableId: encryptId(accountData.account_id),
      });
  
      // Revalidate the path to reflect the changes
      revalidatePath("/");
  
      // Return a success message
      return parseStringify({
        publicTokenExchange: "complete",
      });
    } catch (error) {
      console.error("An error occurred while creating exchanging token:", error);
    }
  }

