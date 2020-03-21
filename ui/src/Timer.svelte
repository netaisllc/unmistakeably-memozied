<script>
    import { fade } from 'svelte/transition';
    import { onMount } from 'svelte';
    
        let started = new Date();
        let now = new Date();

        $: elapsed = (now.getTime() - started) / 1000;
        $: hours = Math.floor(elapsed / 3600 % 24);
        $: minutes = Math.floor(elapsed / 60 % 60);
        $: seconds = Math.floor(elapsed % 60);
        $: displaySeconds = seconds < 10 ? `0${seconds}` : seconds;
        $: displayMinutes = minutes < 10 ? `0${minutes}` : minutes;
        $: displayHours = hours < 10 ? `0${hours}` : hours;

        onMount(() => {
            const interval = setInterval(() => {
                now = new Date();
            }, 1000);

            return () => {
                clearInterval(interval);
            };
        });
</script>

<style>
    .message, .time {        
        font-size: 1.8rem;
        line-height: 4rem;    
        padding-right: .5rem;
        width: 12.5rem;
    }
    .time { 
        border-bottom: 1px solid #DDD;       
        padding: 0 1rem;
        width: 8rem;
    }
    section {
        display: flex;
    }
</style>

<section>
    <div class="message" in:fade>Crawling</div>
    <div class="time" in:fade>{displayHours}:{displayMinutes}:{displaySeconds}</div>
</section>



