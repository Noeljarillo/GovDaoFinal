import Head from "next/head";
import HeaderComponent from "./header";
import Web3Modal from "web3modal";
import { Contract, providers } from "ethers";
import { formatEther } from "ethers/lib/utils";
import { useEffect, useRef, useState } from "react";
import {
  GOVDAODAO_ABI,
  GOVDAODAO_CONTRACT_ADDRESS,
  GALERYKEYS_ABI,
  GALERYKEYS_CONTRACT_ADDRESS
} from "../vars";
import styles from "../styles/Home.module.css";

export default function Home() {
  // ETH Balance of the DAO contract
  const [treasuryBalance, setTreasuryBalance] = useState("0");
  // Number of proposals created in the DAO
  const [numProposals, setNumProposals] = useState("0");
  // Array of all proposals created in the DAO
  const [proposals, setProposals] = useState([]);
  // User's balance of galerykeys NFTs
  const [nftBalance, setNftBalance] = useState(0);
  // set content
  const [content,setContent] = useState(",");
  const [target, setTarget] = useState("");
  const [amount, setAmount] = useState(",");

  // One of "Create Proposal" or "View Proposals"
  const [selectedTab, setSelectedTab] = useState("");
  // True if waiting for a transaction to be mined, false otherwise.
  const [loading, setLoading] = useState(false);
  // True if user has connected their wallet, false otherwise
  const [walletConnected, setWalletConnected] = useState(false);
  const web3ModalRef = useRef();

  // Helper function to connect wallet
  const connectWallet = async () => {
    try {
      await getProviderOrSigner();
      setWalletConnected(true);
    } catch (error) {
      console.error(error);
    }
  };

  // Reads the ETH balance of the DAO contract and sets the `treasuryBalance` state variable
  const getDAOTreasuryBalance = async () => {
    try {
      const provider = await getProviderOrSigner();
      const balance = await provider.getBalance(GOVDAO_CONTRACT_ADDRESS);
      setTreasuryBalance(balance.toString());
    } catch (error) {
      console.error(error);
    }
  };

  // Reads the number of proposals in the DAO contract and sets the `numProposals` state variable
  const getNumProposalsInDAO = async () => {
    try {
      const provider = await getProviderOrSigner();
      const contract = getDaoContractInstance(provider);
      const daoNumProposals = await contract.numProposals();
      setNumProposals(daoNumProposals.toString());
    } catch (error) {
      console.error(error);
    }
  };

  // Reads the balance of the NFTs and sets the `nftBalance` state variable
  const getUserNFTBalance = async () => {
    try {
      const signer = await getProviderOrSigner(true);
      const nftContract = getGalleryKeysContractInstance(signer);
      const balance = await nftContract.balanceOf(signer.getAddress());
      setNftBalance(parseInt(balance.toString()));
    } catch (error) {
      console.error(error);
    }
  };

  // Calls the `createProposal` function in the contract, 
   const createProposal = async () => {
    try {
      const signer = await getProviderOrSigner(true);
      const daoContract = getDaoContractInstance(signer);
      const txn = await daoContract.createProposal(content, amount, target);

      setLoading(true);
      await txn.wait();
      await getNumProposalsInDAO();
      setLoading(false);
    } catch (error) {
      console.error(error);
      window.alert(error.data.message);
    }
  };

  // Helper function to fetch and parse one proposal from the DAO contract
  // Given the Proposal ID
  // and converts the returned data into a Javascript object with values we can use
  const fetchProposalById = async (id) => {
    try {
      const provider = await getProviderOrSigner();
      const daoContract = getDaoContractInstance(provider);
      const proposal = await daoContract.proposals(id);
      const parsedProposal = {
        proposalId: id,
        //nftTokenId: proposal.nftTokenId.toString(),
        deadline: new Date(parseInt(proposal.deadline.toString()) * 1000),
        yesVotes: proposal.yesVotes.toString(),
        noVotes: proposal.noVotes.toString(),
        content: proposal.content,
        executed: proposal.executed,
      };
      return parsedProposal;
    } catch (error) {
      console.error(error);
    }
  };

  // Runs a loop `numProposals` times to fetch all proposals in the DAO
  // and sets the `proposals` state variable
  const fetchAllProposals = async () => {
    try {
      const proposals = [];
      for (let i = 0; i < numProposals; i++) {
        const proposal = await fetchProposalById(i);
        proposals.push(proposal);
      }
      setProposals(proposals);
      return proposals;
    } catch (error) {
      console.error(error);
    }
  };

  // Calls the `voteOnProposal` function in the contract, using the passed
  // proposal ID and Vote
  const voteOnProposal = async (proposalId, _vote) => {
    try {
      const signer = await getProviderOrSigner(true);
      const daoContract = getDaoContractInstance(signer);

      let vote = _vote === "YES" ? 0 : 1;
      const txn = await daoContract.voteOnProposal(proposalId, vote);
      setLoading(true);
      await txn.wait();
      setLoading(false);
      await fetchAllProposals();
    } catch (error) {
      console.error(error);
      window.alert(error.data.message);
    }
  };

  // Calls the `executeProposal` function in the contract, using
  // the passed proposal ID
  const executeProposal = async (proposalId) => {
    try {
      const signer = await getProviderOrSigner(true);
      const daoContract = getDaoContractInstance(signer);
      const txn = await daoContract.executeProposal(proposalId);
      setLoading(true);
      await txn.wait();
      setLoading(false);
      await fetchAllProposals();
    } catch (error) {
      console.error(error);
      window.alert(error.data.message);
    }
  };

  // Helper function to fetch a Provider/Signer instance from Metamask
  const getProviderOrSigner = async (needSigner = false) => {
    const provider = await web3ModalRef.current.connect();
    const web3Provider = new providers.Web3Provider(provider);

    const { chainId } = await web3Provider.getNetwork();
    if (chainId !== 5) {
      window.alert("Please switch to the Goerli network!");
      throw new Error("Please switch to the Goerli network");
    }

    if (needSigner) {
      const signer = web3Provider.getSigner();
      return signer;
    }
    return web3Provider;
  };

  // Helper function to return a DAO Contract instance
  // given a Provider/Signer
  const getDaoContractInstance = (providerOrSigner) => {
    return new Contract(
      GOVDAODAO_CONTRACT_ADDRESS,
      GOVDAODAO_ABI,
      providerOrSigner
    );
  };

  // Helper function to return NFT Contract instance
  // given a Provider/Signer
  const getGalleryKeysContractInstance = (providerOrSigner) => {
    return new Contract(
      GALERYKEYS_CONTRACT_ADDRESS,
      GALERYKEYS_ABI,
      providerOrSigner
    );
  };

  // piece of code that runs everytime the value of `walletConnected` changes
  // so when a wallet connects or disconnects
  // Prompts user to connect wallet if not connected
  // and then calls helper functions to fetch the
  // DAO Treasury Balance, User NFT Balance, and Number of Proposals in the DAO
  useEffect(() => {
    if (!walletConnected) {
      web3ModalRef.current = new Web3Modal({
        network: "goerli",
        providerOptions: {},
        disableInjectedProvider: false,
      });

      connectWallet().then(() => {
        getDAOTreasuryBalance();
        getUserNFTBalance();
        getNumProposalsInDAO();
      });
    }
  }, [walletConnected]);

  // Piece of code that runs everytime the value of `selectedTab` changes
  // Used to re-fetch all proposals in the DAO when user switches
  // to the 'View Proposals' tab
  useEffect(() => {
    if (selectedTab === "View Proposals") {
      fetchAllProposals();
    }
  }, [selectedTab]);

  // Render the contents of the appropriate tab based on `selectedTab`
  function renderTabs() {
    if (selectedTab === "Create Proposal") {
      return renderCreateProposalTab();
    } else if (selectedTab === "View Proposals") {
      return renderViewProposalsTab();
    }
    return null;
  }


  // Renders the 'Create Proposal' tab content
  function renderCreateProposalTab() {
    
   
    
    if (loading) {
      return (
        <div className={styles.description}>
          Loading... Waiting for transaction...
        </div>
      );
    } else if (nftBalance === 0) {
      return (
        <div className={styles.description}>
          No Gallerykeys found. <br />
          <b>You cannot create or vote on proposals</b>
        </div>
      );
    } else {

      //important
      return (
        <div className={styles.container2}>
          <label className={styles.lab}>What do you want to propose?: </label>
          <br />
          <br />

          <textarea type="text" 
          name="site_notes" 
          rows="10"
          length="5"
          class="form-control"
          onChange={(e) => setContent(e.target.value)}>
          </textarea>
          <br />
          <br />
          <label className={styles.lab}>Reciver:</label>
          <input
            placeholder="0x776...."
            type="text"
            onChange={(e) => setTarget(e.target.value)}
          />
          <br />
          <br />
          <label className={styles.lab}> How much Gweis:</label>
          <input
            placeholder="0.1"
            type="number"
            onChange={(e) => setAmount(e.target.value * 10e17)}
          /><br />

          <button className={styles.button2} onClick={createProposal}>
            Create Proposal
          </button>
        </div>
        

      );
    }
  }

  // Renders the 'View Proposals' tab content
  function renderViewProposalsTab() {
    if (loading) {
      return (
        <div className={styles.description}>
          Loading... Waiting for transaction...
        </div>
      );
    } else if (proposals.length === 0) {
      return (
        <div className={styles.description}>No proposals have been created</div>
      );
    } else {
      return (
        <div>
          {proposals.map((p, index) => (
            <div key={index} className={styles.proposalCard}>
              <p>ID: {p.proposalId}</p>
              <p className={styles.proposalContent}><h2>Proposal: </h2> {p.content}</p>
              <p>Deadline: {p.deadline.toLocaleString()}</p>
              <p>Yes Votes: {p.yesVotes} &nbsp; No Votes: {p.noVotes}</p>
              <p>Executed?: {p.executed.toString()}</p>

              {p.deadline.getTime() > Date.now() && !p.executed ? (
                <div className={styles.flex}>
                  <button
                    className={styles.button2}
                    onClick={() => voteOnProposal(p.proposalId, "YES")}
                  >
                    Vote YES
                  </button>
                  
                  <button
                    className={styles.button2}
                    onClick={() => voteOnProposal(p.proposalId, "NO")}
                  >
                    Vote No
                  </button>
                </div>
              ) : p.deadline.getTime() < Date.now() && !p.executed && p.yesVotes > p.noVotes? (
                <div className={styles.flex}>
                  <button
                    className={styles.button2}
                    onClick={() => executeProposal(p.proposalId)}
                  >
                    Execute Proposal{" "}
                    {p.yesVotes > p.noVotes ? "(YES)" : "(NO)"}
                  </button>
                </div>
              ) : (
                <div className={styles.description}>Proposal Finished</div>
              )}
            </div>
          ))}
        </div>
      );
    }
  }

  return (
    <div>
      <Head>
        <title>GOV.DAO</title>
        <meta name="description" content="GOV.DAO" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <HeaderComponent></HeaderComponent>
        
      <div className={styles.main}>
      <div>
          
        </div>
        <div className={styles.end}>
          <h1 className={styles.title}>Welcome to GOV.DAO</h1>
          
          <div className={styles.description}>
            Your Gallery keys Balance: {nftBalance}
            <br />
            <br />
            Treasury Balance: {formatEther(treasuryBalance)} ETH
            <br />
            Total Number of Proposals: {numProposals}
          </div>
          <div className={styles.flex}>
            <button
              className={styles.button}
              onClick={() => setSelectedTab("Create Proposal")}
            >
              Create Proposal
            </button>
            <button
              className={styles.button}
              onClick={() => setSelectedTab("View Proposals")}
            >
              View Proposals
            </button>
          </div>
          {renderTabs()}
        </div>
        
      </div>

      <footer className={styles.footer}>
        For more info visit us at SaySomenthing Gallery
      </footer>
    </div>
  );
}