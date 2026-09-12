import { logReadingProgress } from "@/storage/reading";
import { useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as z from "zod";

const ReadingProgressSchema = z.object({
  title: z.string().min(1),
  currentPage: z.coerce.number().min(1),
  pageCount: z.coerce.number().min(1),
});

interface LogReadingProps {
  onSuccess: () => void;
}

export default function LogReading({ onSuccess }: LogReadingProps) {
  const [modalVisible, setModalVisible] = useState(false);

  const [title, setTitle] = useState("");
  const [pageCount, setPageCount] = useState("");
  const [currentPage, setCurrentPage] = useState("");

  const [titleError, setTitleError] = useState("");
  const [pageCountError, setPageCountError] = useState("");
  const [currentPageError, setCurrentPageError] = useState("");

  function clearAndCloseModal() {
    setTitle("");
    setPageCount("");
    setCurrentPage("");
    clearErrors();
    setModalVisible(false);
  }

  function clearErrors() {
    setTitleError("");
    setPageCountError("");
    setCurrentPageError("");
  }

  function handleLogReadingPress() {
    setModalVisible(true);
  }

  function handleCancelPress() {
    clearAndCloseModal();
  }

  async function handleSubmitPress() {
    try {
      clearErrors();

      const rawReadingProgress = {
        title,
        pageCount,
        currentPage,
      };

      const readingProgress = ReadingProgressSchema.parse(rawReadingProgress);

      await logReadingProgress(readingProgress);

      clearAndCloseModal();
      onSuccess();
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.log(error);
        error.issues.forEach((issue) => {
          switch (issue.path[0]) {
            case "title":
              setTitleError(issue.message);
              break;
            case "pageCount":
              if (issue.code === "invalid_type") {
                setPageCountError("Input must be a positive whole number");
              } else {
                setPageCountError(issue.message);
              }
              break;
            case "currentPage":
              if (issue.code === "invalid_type") {
                setCurrentPageError("Input must be a positive whole number");
              } else {
                setCurrentPageError(issue.message);
              }
              break;
          }
        });
      }
    }
  }

  return (
    <View>
      <Pressable
        style={[styles.button, styles.buttonOpen]}
        onPress={handleLogReadingPress}
      >
        <Text>Log Reading</Text>
      </Pressable>
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          Alert.alert("Modal has been closed.");
          setModalVisible(!modalVisible);
        }}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <Text style={styles.modalText}>Log Some Reading</Text>
            <TextInput
              placeholder="Title"
              value={title}
              style={titleError && styles.inputError}
              onChangeText={setTitle}
            />
            {titleError && (
              <Text style={styles.errorMessage}>{titleError}</Text>
            )}
            <TextInput
              keyboardType="numeric"
              placeholder="Page count"
              value={pageCount}
              style={pageCountError && styles.inputError}
              onChangeText={setPageCount}
            />
            {pageCountError && (
              <Text style={styles.errorMessage}>{pageCountError}</Text>
            )}
            <TextInput
              keyboardType="numeric"
              placeholder="Current page"
              value={currentPage}
              style={currentPageError && styles.inputError}
              onChangeText={setCurrentPage}
            />
            {currentPageError && (
              <Text style={styles.errorMessage}>{currentPageError}</Text>
            )}
            <View style={{ flexDirection: "row" }}>
              <Pressable
                style={[styles.button, styles.buttonSubmit]}
                onPress={handleSubmitPress}
              >
                <Text style={styles.textStyle}>Submit</Text>
              </Pressable>
              <Pressable
                style={[styles.button, styles.buttonCancel]}
                onPress={handleCancelPress}
              >
                <Text style={styles.textStyle}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalView: {
    margin: 20,
    backgroundColor: "white",
    borderRadius: 20,
    padding: 35,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  button: {
    borderRadius: 20,
    margin: 10,
    padding: 10,
    elevation: 2,
  },
  buttonCancel: {
    backgroundColor: "rgb(243, 33, 33)",
  },
  buttonOpen: {
    backgroundColor: "#F194FF",
  },
  buttonSubmit: {
    backgroundColor: "#2196F3",
  },
  errorMessage: {
    color: "red",
  },
  inputError: {
    backgroundColor: "#ff00002a",
  },
  textStyle: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center",
  },
  modalText: {
    marginBottom: 15,
    textAlign: "center",
  },
});
