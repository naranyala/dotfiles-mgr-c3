module tinyfiledialogs;

extern fn char* tinyfd_getGlobalChar(char* aCharVariableName) ;
extern fn int tinyfd_getGlobalInt(char* aIntVariableName) ;
extern fn int tinyfd_setGlobalInt(char* aIntVariableName, int aValue) ;
extern fn void tinyfd_beep() ;

extern fn int tinyfd_notifyPopup(
    char* aTitle,
    char* aMessage,
    char* aIconType
) ;

extern fn int tinyfd_messageBox(
    char* aTitle,
    char* aMessage,
    char* aDialogType,
    char* aIconType,
    int aDefaultButton
) ;

extern fn char* tinyfd_inputBox(
    char* aTitle,
    char* aMessage,
    char* aDefaultInput
) ;

extern fn char* tinyfd_saveFileDialog(
    char* aTitle,
    char* aDefaultPathAndOrFile,
    int aNumOfFilterPatterns,
    char** aFilterPatterns,
    char* aSingleFilterDescription
) ;

extern fn char* tinyfd_openFileDialog(
    char* aTitle,
    char* aDefaultPathAndOrFile,
    int aNumOfFilterPatterns,
    char** aFilterPatterns,
    char* aSingleFilterDescription,
    int aAllowMultipleSelects
) ;

extern fn char* tinyfd_selectFolderDialog(
    char* aTitle,
    char* aDefaultPath
) ;

extern fn char* tinyfd_colorChooser(
    char* aTitle,
    char* aDefaultHexRGB,
    char* aDefaultRGB,
    char* aoResultRGB
) ;
