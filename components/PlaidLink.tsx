import React,{useCallback, useEffect, useState} from 'react'
import { Button } from './ui/button'
import { PlaidLinkOnSuccess, PlaidLinkOptions, usePlaidLink } from 'react-plaid-link'
import { useRouter } from 'next/navigation';
import { createLinkToken, exchangePublicToken } from '@/lib/actions/user.action';

const PlaidLink = ({user,variant}:PlaidLinkProps) => {
    const router = useRouter();
    const [token,setToken] = useState('');
    useEffect(()=>{
        const getLinkToken = async () => {
            try {
            // console.log(user);
              const data = await createLinkToken(user);
              if (data?.linkToken) {
                setToken(data.linkToken);
              } else {
                console.error('Failed to fetch link token.',data);
              }
            } catch (error) {
              console.error('Error fetching link token:', error);
            }
          };
        getLinkToken();
    },[user])
    const onSuccess = useCallback<PlaidLinkOnSuccess>(async (public_token:string) =>{
        await exchangePublicToken({
            publicToken : public_token,
            user,
        });
        router.push("/");
    },[user])
    const config: PlaidLinkOptions = {
        token,
        onSuccess
    }
    const { open, ready } = usePlaidLink(config);
    // console.log(ready);
  return (
    <>
        {variant==='primary'?(
            <Button 
                onClick={() => open()}
                disabled={!ready}
                className="plaidlink-primary"
            >
                Connect Bank
            </Button>
        ):variant=='ghost'?(
            <Button>
                Connect Bank
            </Button>
        ): (
            <Button>
                Connect Bank
            </Button>
        )}
    </>
  )
}

export default PlaidLink

function useCallBack(arg0: () => Promise<void>) {
    throw new Error('Function not implemented.')
}
