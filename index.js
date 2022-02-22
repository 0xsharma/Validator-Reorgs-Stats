const axios = require("axios");
const Web3 = require('web3');

var WSWEB3 = 'ws://localhost:8546'  // WebSocket endpoint for the RPC server
var HTTPSWEB3 = 'http://localhost:8545'  // HTTP endpoint for the RPC server 

var web3 = new Web3(Web3.givenProvider || WSWEB3);

var config
var apiKey

var mapReorged = new Map(); //map for storing the validators and number of blocks displaced by them
var mapRemoved = new Map(); // map for storing the validators and the number of their blocks removed
var mapMined = new Map(); //map for storing the validators and number of canonical blocks mined by them
var mapReorgedPercentage = new Map();   //map for storing the validators and the percentage of the blocks reorged by them
var mapRemovedPercentage = new Map();   //map for storing the validators and the percentage of their blocks removed
var mapRemovedGasUsed = new Map(); //map for storing the validators and average gasUsed by their dropped blocks. 

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

async function getLatestBlocks() {
    await axios.post(`http://ethstats-backend-alb-145109141.us-west-2.elb.amazonaws.com:8080/v1/graphql`, {
        query: `
        {
            headentry(where: {typ: {_eq: "del"}}, distinct_on: block_number) {
              block {
                number
                miner
                hash
                gas_used
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
            var blockGasUsed = res[i].block.gas_used;

            var blockValidator = await getBlockValidator(blockNum);

            if(blockValidator != blockMiner){

                if(mapReorged.get(blockValidator)===undefined){
                    mapReorged.set(blockValidator, 1);
                }else{
                    mapReorged.set(blockValidator, mapReorged.get(blockValidator)+1);
                }

                if(mapRemoved.get(blockMiner)===undefined){
                    mapRemoved.set(blockMiner, 1);
                    mapRemovedGasUsed.set(blockMiner, blockGasUsed);
                }else{
                    mapRemoved.set(blockMiner, mapRemoved.get(blockMiner)+1);
                    mapRemovedGasUsed.set(blockMiner, blockGasUsed/mapRemoved.get(blockMiner));
                }
            }
        }
        console.log("Validators and number of blocks displaced by them\n\n", mapReorged, "\n\n");
        console.log("Validators and the number of their blocks removed\n\n", mapRemoved, "\n\n");
        console.log("Validators and average gasUsed by their dropped blocks\n\n", mapRemovedGasUsed, "\n\n");
    })
}

async function getAllBlocks() {
    var startBlock = 25085190; //starting block for stable ethstats-backednd
    endBlock = await web3.eth.getBlockNumber(); //ending block for stable ethstats-backednd
    for(var i = startBlock; i<=endBlock; i++){
        var block = await web3.eth.getBlock(i);
        if(block===null){
            continue;
        }
        var blockMiner = block.miner;

        if(mapMined.get((blockMiner))===undefined){
            mapMined.set(blockMiner, 1);
        }
        else{
            mapMined.set(blockMiner, mapMined.get(blockMiner)+1);
        }
        
    }

    console.log("Validators and number of canonical blocks mined by them\n\n", mapMined, "\n\n");

    //calculating the percentage of blocks reorged per miner
    for(var [key, value] of mapReorged.entries()){
        var reorgedPercentage = (value/mapMined.get(key))*100;
        mapReorgedPercentage.set(key, reorgedPercentage);
    }

    //calculating the percentage of blocks removed per miner
    for(var [key, value] of mapRemoved.entries()){
        var removedPercentage = (value/mapMined.get(key))*100;
        mapRemovedPercentage.set(key, removedPercentage);
    }

    console.log("Validators and the percentage of the blocks reorged by them\n\n", mapReorgedPercentage, "\n\n");
    console.log("Validators and the percentage of their blocks removed\n\n", mapRemovedPercentage, "\n\n");

}

async function main(){

    apiKey = process.argv[2];
    if(apiKey == undefined){
        console.log("Please provide an API key \n\nnode index.js <API_KEY>");
        process.exit(1);
    }

    config = {
        headers: {
            'x-hasura-admin-secret': apiKey,
            'content-type': 'application/json'
        }
    }

    await getLatestBlocks();
    await getAllBlocks();
}

main()
