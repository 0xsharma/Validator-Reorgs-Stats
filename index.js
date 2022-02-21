const axios = require("axios");

async function main(){

    var apiKey = process.argv[2];
    if(apiKey == undefined){
        console.log("Please provide an API key \n\nnode index.js <API_KEY>");
        process.exit(1);
    }

    let config = {
        headers: {
            'x-hasura-admin-secret': apiKey,
            'content-type': 'application/json'
        }
    }

    async function getLatestBlocks() {
        await axios.post(`http://ethstats-backend-alb-145109141.us-west-2.elb.amazonaws.com:8080/v1/graphql`, {
            query: `
            {
                headentry(where: {typ: {_eq: "del"}}) {
                  block {
                    number
                    miner
                    hash
                  }
                }
              }
              `,
        },config)
        .then(async (response) => {
            console.log(response.data.data.headentry);
        })
    }

    await getLatestBlocks();
}

main()
