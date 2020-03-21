<script> 
    import Timer from './Timer.svelte';
    import { next, pages, previous, showInputs, showResults, stateInputting, statePending, stateUrlError } from './store.js';
    import { startCrawl } from './network.js';

    let url;
    let limit;

    const acceptPages = (data) => {
        $next = data.after ? data.after : false;
        $pages = data;
        $previous = data.before ? data.before : false;
        $showInputs = false;
        $showResults = true;
        $statePending = false;
        $stateUrlError = false;
    }

    const reset = () => {
        $showInputs = true;
        $showResults = false;
        $stateInputting = true;
        $statePending = false;
        $stateUrlError = false;
        limit = 0;
        url ='';
    }

    const submitCrawl = () => {
        $stateInputting = false;
        $statePending = true;   
        $stateUrlError = false;     
        startCrawl(url, limit)
            .then((data) => acceptPages(data))
            .catch((err) => {
                $statePending = false;                 
                $stateUrlError = true;
                url = url + ' is not a valid target. Try another.'
            });
    }    
</script>

<style>
.area {
    display: flex;
    flex-direction: column;
    font-size: 1.8rem;
    height: 30vh;
    margin: 2rem;
    margin-left: 13vw;
    text-align: left;
    width: 100%;
}

.input, label, input {
    height: 4rem;
}

.input {   
    display: flex;
    margin: 0 0 3rem;
}

label {
    line-height: 4rem;
    width: 12.5rem;
}

label span {
    color: #999;
    margin-left: 1rem;
}

input {
    padding: .5rem 1rem;
}
input[disabled] {
    background-color: transparent;
    border: 1px solid #DDD;
}

.limit {
    padding-right: .5rem;
    width: 8rem;
}

.url {
    width: 40rem;
}

.input.button.hidden {
    display: none;
    height: 0;
    visibility: hidden;
}

button {
    background-color: #ff3e00;
    border: 1px solid  #ff3e00;
    color: white;
    height: 5rem;
    opacity: .20;
    padding: 1rem 2rem;
    transition: all 300ms ease-in-out;
}
button.active {
    cursor: pointer;
    opacity: 1.0;
}
button.active:active {
    opacity: .75;
}
</style>

<div class="area">
    <div class="input">
        <label>URL <span>http(s)://</span></label>
        <input class="url" type="text" bind:value={url} placeholder="walrus.ai" disabled={$statePending}>
    </div>    
    <div class="input">
        <label>No. of pages</label>
        <input class="limit" type="number" bind:value={limit} placeholder="12"
            disabled={$statePending}>
    </div>

    <div class="input button" class:hidden="{!$stateInputting}">
        <label></label>
        <button class:active="{url && limit}"
            on:click={submitCrawl}>
            Start a crawl
        </button>
    </div>

    <div class="input button" class:hidden="{!$stateUrlError}">
        <label></label>
        <button class="active" on:click={reset}>
            Reset
        </button>
    </div>

    {#if $statePending === true && !stateUrlError === false}
        <Timer></Timer>
    {/if}    
</div>