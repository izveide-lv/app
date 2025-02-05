const isMac = () => typeof navigator !== 'undefined' && /Mac|iPhone|iPod|iPad/i.test(navigator.userAgentData?.platform || navigator.platform);

export default isMac;
