export const generateWorkflowId = (prefix: string): string => {
  if (prefix.trim().length === 0) { 
    throw Error('Empty prefix');
  }

  return `${prefix.trim()}-${new Date().getTime()}`;
};

