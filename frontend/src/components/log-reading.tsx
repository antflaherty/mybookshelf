import { logReadingProgress } from "@/api/apiClient";
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
import { Dropdown } from "react-native-element-dropdown";
import { Book } from "@/lib/definitions";

const ReadingProgressSchema = z.object({
  id: z.string().min(1),
  currentPage: z.coerce.number().min(1),
});

interface LogReadingProps {
  onSuccess: () => void;
  books: Book[];
}

export default function LogReading({ onSuccess, books }: LogReadingProps) {
  const [modalVisible, setModalVisible] = useState(false);

  const [id, setId] = useState("");
  const [currentPage, setCurrentPage] = useState("");

  const [titleError, setTitleError] = useState("");
  const [currentPageError, setCurrentPageError] = useState("");

  const bookDropdownData = books.map((book) => {
    return { value: book.id, label: book.title };
  });

  function clearAndCloseModal() {
    setCurrentPage("");
    clearErrors();
    setModalVisible(false);
  }

  function clearErrors() {
    setTitleError("");
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
        id,
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
            case "id":
              setTitleError(issue.message);
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
            <Dropdown
              style={styles.dropdown}
              data={bookDropdownData}
              search
              maxHeight={300}
              labelField="label"
              valueField="value"
              searchPlaceholder="Select title"
              value={id}
              onChange={(item: { value: string }) => {
                setId(item.value);
              }}
            />
            {titleError && (
              <Text style={styles.errorMessage}>{titleError}</Text>
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
  dropdown: {
    margin: 16,
    height: 50,
    width: 150,
    backgroundColor: "#EEEEEE",
    borderRadius: 22,
    paddingHorizontal: 8,
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
