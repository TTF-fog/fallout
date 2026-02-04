<script>
  let email = "";
  let submitted = false;
  let submitting = false;
  let error = "";

  async function submit() {
    if (!email || submitting) return;
    submitting = true;
    error = "";

    try {
      const formData = new FormData();
      formData.append("Email", email);

      const res = await fetch("/api/rsvp", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to submit");
      }

      submitted = true;
      email = "";
    } catch (e) {
      error = e instanceof Error ? e.message : "Something went wrong";
    } finally {
      submitting = false;
    }
  }
</script>

<svelte:head>
  <title>Fallout: Hardware Hackathon</title>
  <meta
    name="description"
    content="A seven-day hardware hackathon in ShenZhen, China in 2026. Design hardware projects, build them, & qualify!"
  />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="Fallout: Hardware Hackathon" />
  <meta
    property="og:description"
    content="A seven-day hardware hackathon in ShenZhen, China in 2026. Design hardware projects, build them, & qualify!"
  />
  <meta property="og:site_name" content="Fallout" />
</svelte:head>

<section class="relative w-full h-svh overflow-hidden bg-[#38C9FF] font-['Outfit']">
  <!-- Hero background image -->
  <img
    class="absolute inset-0 w-full h-full object-cover object-bottom z-0"
    src="/landing/hero.webp"
    alt=""
    aria-hidden="true"
  />

  <!-- Content wrapper -->
  <div class="absolute top-[8%] md:top-[5%] lg:top-[8%] left-1/2 -translate-x-1/2 z-10 flex flex-col items-center w-full px-2 md:px-0">
    <!-- Date -->
    <div class="text-white text-lg md:text-xl lg:text-[36px] tracking-[0.05em] drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">
      July 1-7, 2026
    </div>

    <!-- Logo with shadow for contrast -->
    <img
      class="w-[280px] md:w-[320px] lg:w-[500px] h-auto drop-shadow-[0_4px_8px_rgba(0,0,0,0.25)]"
      src="/landing/logo.svg"
      alt="Fallout"
    />

    <!-- Tagline -->
    <div class="-rotate-[1.4deg] bg-[#FF27AB] text-white text-center px-3 py-1.5 md:px-3 md:py-1.5 lg:px-4 lg:py-2 text-xs md:text-base lg:text-2xl -mt-3 md:-mt-3 lg:-mt-4 whitespace-nowrap">
      go to a Hack Club <strong>hardware hackathon</strong> in ShenZhen
    </div>

    <!-- Signup form -->
    {#if submitted}
      <div class="bg-[#36BA77] text-white px-4 py-2 md:px-6 md:py-4 text-base md:text-lg text-center mt-4 md:mt-4 animate-[popUp_0.4s_ease-out]">
        Cheers! An email will be coming in the next weeks...
      </div>
    {:else}
      <form
        class="-rotate-[0.5deg] flex flex-row items-center gap-0 mt-4 md:mt-4"
        onsubmit={(e) => { e.preventDefault(); submit(); }}
      >
        <input
          class="w-[220px] md:w-[280px] lg:w-[320px] px-4 md:px-6 py-2.5 md:py-3 text-base md:text-xl border border-white bg-[#00c261] text-white placeholder-white outline-none"
          type="email"
          bind:value={email}
          placeholder="enter your email..."
          required
        />
        <button
          class="px-4 md:px-6 py-2.5 md:py-3 text-xl md:text-2xl border border-white border-l-0 bg-[#00c261] text-white cursor-pointer transition-transform hover:scale-105 hover:bg-[#00de89] disabled:opacity-50"
          aria-label="Submit"
          disabled={submitting}
        >
          {submitting ? "..." : ">"}
        </button>
      </form>
      {#if error}
        <div class="text-red-500 bg-white/90 px-4 py-2 mt-2 text-sm">
          {error}
        </div>
      {/if}
    {/if}
  </div>
</section>

<style>
  @keyframes popUp {
    0% {
      opacity: 0;
      transform: translateX(-50%) scale(0.5);
    }
    70% {
      transform: translateX(-50%) scale(1.1);
    }
    100% {
      opacity: 1;
      transform: translateX(-50%) scale(1);
    }
  }
</style>
