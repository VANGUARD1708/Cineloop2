export async function shareEpisode(title: string, url?: string) {
  if (navigator.share) {
    await navigator.share({
      title,
      url: url || window.location.href,
    });
  } else {
    await navigator.clipboard.writeText(
      url || window.location.href
    );
    alert("Link copied");
  }
}