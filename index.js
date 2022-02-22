const axios = require("axios");

var HTTPSWEB3 = 'http://localhost:8545'

var map = new Map();

async function getBlockValidator(blockNum){
    var hexBlockNum = '0x' + blockNum.toString(16)
    await axios.post(HTTPSWEB3 ,{
        jsonrpc: '2.0',
        method: 'bor_getAuthor',
        params: [hexBlockNum],
        id: 1
    }, {
        headers: {
        'Content-Type': 'application/json',
        },
    }).then((response) => {
        blockMiner = response.data.result
    })

    return blockMiner
}

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
                headentry(where: {typ: {_eq: "del"}}, distinct_on: block_number) {
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
            var res = response.data.data.headentry; 

            for(var i=0; i<res.length; i++){
                
                if(res[i].block===null){
                    continue;
                }
                var blockNum = res[i].block.number;
                var blockMiner = res[i].block.miner;

                var blockValidator = await getBlockValidator(blockNum);

                if(blockValidator != blockMiner){

                    if(map.get(blockValidator)===undefined){
                        map.set(blockValidator, 1);
                    }
                    else{
                        map.set(blockValidator, map.get(blockValidator)+1);
                    }
                }
            }

            console.log(map);
        })
    }

    await getLatestBlocks();
}

main()
