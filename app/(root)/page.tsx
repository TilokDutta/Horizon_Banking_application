import HeaderBox from '@/components/HeaderBox'
import RightSideBar from '@/components/RightSideBar'
import TotalBalanceBox from '@/components/TotalBalanceBox'
import { getLoggedInUser } from '@/lib/actions/user.action'
import React from 'react'

const Home = async() => {
    const loggedIn = await getLoggedInUser()
    // console.log(loggedIn);
  return (
    <section className="home">
        <div className="home-content">
            <header className="home-header">
                <HeaderBox
                    type="greeting"
                    title="Welcome"
                    user={loggedIn?.name || 'guest'}
                    subtext="Access and manage your account and transactions efficiently."
                />
                <TotalBalanceBox
                    accounts={[]}
                    totalBanks = {2}
                    totalCurrentBalance={3005.50}
                />
            </header>
            RECENT TRANSACTION
        </div>
        <RightSideBar
            user={loggedIn}
            teansactions={[]}
            banks={[{currentBalance:6500},{currentBalance:5000}]}
        />
    </section>
  )
}

export default Home